import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import { detectAnomalies, parseCSVDate, parseCSVAmount } from './anomaly.service.js';
import { createExpense } from './expense.service.js';
import { createPayment } from './payment.service.js';
import { addOrUpdateGroupMember } from './group.service.js';

// In-memory sessions store for parsed imports awaiting user resolution
const importSessions = new Map();

/**
 * Parses a CSV buffer into JSON rows.
 */
export function parseCSVBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString('utf8'));
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

/**
 * Initializes a CSV import session: parses data, scans for anomalies, and saves rows.
 */
export async function initializeImportSession(groupId, buffer) {
  const rawRows = await parseCSVBuffer(buffer);
  const scannedData = await detectAnomalies(groupId, rawRows);
  
  // Generate session ID
  const importSessionId = Math.random().toString(36).substring(2, 15);
  
  // Save to in-memory store
  importSessions.set(importSessionId, { groupId, scannedData });
  
  // Return scanned anomalies list to frontend
  return {
    importSessionId,
    anomalies: scannedData
      .filter(row => row.anomalies.length > 0)
      .map(row => ({
        rowNumber: row.rowNumber,
        description: row.raw.description,
        anomalies: row.anomalies
      }))
  };
}

/**
 * Commits resolutions and imports the session data in a single transactional query.
 */
export async function commitImportResolutions(importSessionId, resolutions = []) {
  const session = importSessions.get(importSessionId);
  if (!session) {
    throw new Error('Import session expired or not found. Please upload the CSV again.');
  }

  const { groupId, scannedData } = session;
  const resolutionMap = {}; // rowNumber -> array of resolutions
  resolutions.forEach(r => {
    resolutionMap[r.rowNumber] = r;
  });

  const reportLogs = [];
  let importedCount = 0;
  let skippedCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  // Execute import under standard PostgreSQL transaction
  await withTransaction(async (client) => {
    // Fetch users for resolving mapping actions
    const usersRes = await client.query('SELECT id, name FROM users');
    const userMap = {}; // name.toLowerCase() -> user info
    usersRes.rows.forEach(u => {
      userMap[u.name.toLowerCase()] = u;
    });

    for (const row of scannedData) {
      const rowNum = row.rowNumber;
      const res = resolutionMap[rowNum];
      
      let shouldSkip = false;
      let dateOverride = row.date_parsed;
      let payerOverride = row.payer_id;
      let excludeMembers = new Set();
      let isSettlementOverride = false;
      let percentageOverride = null;

      // Handle duplicate decisions from previous rows
      const hasDuplicateAnomaly = row.anomalies.some(a => a.type === 'duplicate' || a.type === 'conflicting_duplicate');

      // 1. Process explicit user resolution action if provided
      if (res) {
        if (res.action === 'skip') {
          shouldSkip = true;
          skippedCount++;
          reportLogs.push(`Row ${rowNum}: Ignored/Skipped by user action.`);
        } else if (res.action === 'assign_payer') {
          payerOverride = res.selectedUserId;
          reportLogs.push(`Row ${rowNum}: Assigned missing payer to user (ID: ${res.selectedUserId}).`);
        } else if (res.action === 'select_date') {
          dateOverride = res.selectedDate;
          reportLogs.push(`Row ${rowNum}: Overrode ambiguous date as '${res.selectedDate}'.`);
        } else if (res.action === 'keep_original' && hasDuplicateAnomaly) {
          shouldSkip = true;
          skippedCount++;
          reportLogs.push(`Row ${rowNum}: Dropped duplicate row in favor of original DB entry.`);
        } else if (res.action === 'import_as_settlement') {
          isSettlementOverride = true;
        } else if (res.action === 'exclude_member') {
          excludeMembers.add(res.memberId);
          reportLogs.push(`Row ${rowNum}: Excluded inactive member (User ID: ${res.memberId}) from split calculation.`);
        } else if (res.action === 'add_member') {
          // Add Kabir or new user
          const name = res.memberName;
          const email = `${name.toLowerCase().replace(/\s+/g, '')}@demo.com`;
          const bcrypt = await import('bcryptjs');
          const dummyPassword = await bcrypt.default.hash('demo123', 10);
          
          const insertUser = await client.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [name, email, dummyPassword]
          );
          const newUserId = insertUser.rows[0].id;
          
          // Add membership
          await client.query(
            `INSERT INTO group_memberships (group_id, user_id, joined_at)
             VALUES ($1, $2, $3)`,
            [groupId, newUserId, dateOverride || '2026-02-01']
          );

          // Update map
          userMap[name.toLowerCase()] = { id: newUserId, name };
          
          // Check if this user was the payer
          if (row.raw.paid_by && row.raw.paid_by.toLowerCase() === name.toLowerCase()) {
            payerOverride = newUserId;
          }
          
          reportLogs.push(`Row ${rowNum}: Created temporary member '${name}' and registered group membership.`);
        } else if (res.action === 'map_member') {
          const targetId = res.targetUserId;
          payerOverride = targetId;
          reportLogs.push(`Row ${rowNum}: Mapped typo user '${row.raw.paid_by}' to database member (ID: ${targetId}).`);
        } else if (res.action === 'normalize_percentages') {
          percentageOverride = 'normalize';
        }
      }

      // Check auto-fixes for warning alerts
      row.anomalies.forEach(anomaly => {
        if (anomaly.action === 'auto_fix') {
          warningCount++;
          reportLogs.push(`Row ${rowNum}: Auto-fixed warning (${anomaly.type}) - ${anomaly.description}`);
        } else if (anomaly.severity === 'error') {
          if (!res) {
            // Block missing resolutions
            throw new Error(`Row ${rowNum} requires manual resolution for error: ${anomaly.description}`);
          }
        }
      });

      if (shouldSkip) {
        // Log skipped row
        await client.query(
          `INSERT INTO import_logs (row_number, problem_type, description, action_taken)
           VALUES ($1, $2, $3, $4)`,
          [rowNum, 'duplicate_skip', row.raw.description, 'skip']
        );
        continue;
      }

      // Parse split participants and mapping names
      const participantsNames = row.raw.split_with.split(';').map(p => p.trim()).filter(Boolean);
      let participantList = [];

      for (const name of participantsNames) {
        const lowerName = name.toLowerCase();
        let userId = null;

        if (userMap[lowerName]) {
          userId = userMap[lowerName].id;
        } else {
          // If mapping resolution was passed for this participant
          if (res && res.action === 'map_member' && res.memberName === name) {
            userId = res.targetUserId;
          } else if (res && res.action === 'add_member' && res.memberName === name) {
            // Retrieve newly inserted ID
            userId = userMap[name.toLowerCase()]?.id;
          }
        }

        if (userId && !excludeMembers.has(userId)) {
          participantList.push({ userId });
        }
      }

      // Check default participant list if empty (Equal split default is all active members)
      if (participantList.length === 0) {
        const activeMembersRes = await client.query(
          `SELECT user_id FROM group_memberships
           WHERE group_id = $1
             AND joined_at <= $2
             AND (left_at IS NULL OR left_at >= $2)`,
          [groupId, dateOverride]
        );
        participantList = activeMembersRes.rows.map(r => ({ userId: r.user_id }));
      }

      // 2. Commit transaction row
      if (isSettlementOverride || row.anomalies.some(a => a.type === 'settlement_entry' && (!res || res.action === 'import_as_settlement'))) {
        // Record as Settlement Payment
        // Resolve payee (recipient)
        const recipientName = participantsNames[0];
        let recipientId = userMap[recipientName?.toLowerCase()]?.id;
        
        if (!payerOverride || !recipientId) {
          throw new Error(`Row ${rowNum}: Cannot import settlement. Invalid payer or recipient mapping.`);
        }

        await client.query(
          `INSERT INTO payments (group_id, paid_by, paid_to, amount, payment_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [groupId, payerOverride, recipientId, row.amount_parsed, dateOverride, `Imported Settlement: ${row.raw.description}`]
        );

        importedCount++;
        reportLogs.push(`Row ${rowNum}: Settlement payment recorded from Payer (ID: ${payerOverride}) to Recipient (ID: ${recipientId}).`);
      } else {
        // Record as shared Expense
        // Build unified creation splits list
        const splitType = row.raw.split_type || 'equal';
        const formattedParticipants = [];

        // Parse percentages, shares, or unequal split details
        if (splitType === 'percentage' && row.raw.split_details) {
          const splits = row.raw.split_details.split(';').map(s => s.trim()).filter(Boolean);
          let sumPct = 0;
          const pctMap = {};
          
          splits.forEach(s => {
            const parts = s.split(/\s+/);
            if (parts.length >= 2) {
              const name = parts[0].toLowerCase();
              const pct = parseFloat(parts[1].replace('%', ''));
              pctMap[name] = pct;
              sumPct += pct;
            }
          });

          // Normalize if requested by user
          const scale = (percentageOverride === 'normalize' && sumPct > 0) ? (100 / sumPct) : 1.0;

          participantList.forEach(p => {
            // Find name
            const uName = Object.keys(userMap).find(k => userMap[k].id === p.userId);
            const pct = (pctMap[uName] || 0) * scale;
            formattedParticipants.push({
              userId: p.userId,
              percentage: Math.round(pct * 100) / 100
            });
          });

        } else if (splitType === 'share' && row.raw.split_details) {
          const splits = row.raw.split_details.split(';').map(s => s.trim()).filter(Boolean);
          const shareMap = {};
          
          splits.forEach(s => {
            const parts = s.split(/\s+/);
            if (parts.length >= 2) {
              const name = parts[0].toLowerCase();
              const sh = parseInt(parts[1], 10);
              shareMap[name] = sh;
            }
          });

          participantList.forEach(p => {
            const uName = Object.keys(userMap).find(k => userMap[k].id === p.userId);
            formattedParticipants.push({
              userId: p.userId,
              shares: shareMap[uName] || 1
            });
          });

        } else if (splitType === 'unequal' && row.raw.split_details) {
          const splits = row.raw.split_details.split(';').map(s => s.trim()).filter(Boolean);
          const customMap = {};
          
          splits.forEach(s => {
            const parts = s.split(/\s+/);
            if (parts.length >= 2) {
              const name = parts[0].toLowerCase();
              const amt = parseFloat(parts[1]);
              customMap[name] = amt;
            }
          });

          participantList.forEach(p => {
            const uName = Object.keys(userMap).find(k => userMap[k].id === p.userId);
            formattedParticipants.push({
              userId: p.userId,
              customAmount: customMap[uName] || 0
            });
          });

        } else {
          // Equal split - standard list
          participantList.forEach(p => {
            formattedParticipants.push({ userId: p.userId });
          });
        }

        // Direct transactional insert
        // Call helper with client block config parameter
        const rate = row.currency_parsed === 'USD' ? parseFloat(process.env.USD_TO_INR_RATE || 84) : 1.0000;
        const amountInr = Math.round(row.amount_parsed * rate * 100) / 100;

        // Perform splits arithmetic directly
        const calculatedSplits = [];
        if (splitType === 'equal') {
          const splitVal = amountInr / formattedParticipants.length;
          let splitSum = 0;
          formattedParticipants.forEach(p => {
            const val = Math.round(splitVal * 100) / 100;
            calculatedSplits.push({ userId: p.userId, amountOwed: val, metadata: {} });
            splitSum += val;
          });
          const remainder = Math.round((amountInr - splitSum) * 100) / 100;
          if (remainder !== 0) {
            calculatedSplits[calculatedSplits.length - 1].amountOwed = 
              Math.round((calculatedSplits[calculatedSplits.length - 1].amountOwed + remainder) * 100) / 100;
          }
        } else if (splitType === 'percentage') {
          let splitSum = 0;
          formattedParticipants.forEach(p => {
            const val = Math.round((amountInr * (p.percentage / 100)) * 100) / 100;
            calculatedSplits.push({ userId: p.userId, amountOwed: val, metadata: { percentage: p.percentage } });
            splitSum += val;
          });
          const remainder = Math.round((amountInr - splitSum) * 100) / 100;
          if (remainder !== 0) {
            calculatedSplits[calculatedSplits.length - 1].amountOwed = 
              Math.round((calculatedSplits[calculatedSplits.length - 1].amountOwed + remainder) * 100) / 100;
          }
        } else if (splitType === 'share') {
          const totalShares = formattedParticipants.reduce((sum, p) => sum + p.shares, 0);
          let splitSum = 0;
          formattedParticipants.forEach(p => {
            const val = Math.round((amountInr * (p.shares / totalShares)) * 100) / 100;
            calculatedSplits.push({ userId: p.userId, amountOwed: val, metadata: { shares: p.shares } });
            splitSum += val;
          });
          const remainder = Math.round((amountInr - splitSum) * 100) / 100;
          if (remainder !== 0) {
            calculatedSplits[calculatedSplits.length - 1].amountOwed = 
              Math.round((calculatedSplits[calculatedSplits.length - 1].amountOwed + remainder) * 100) / 100;
          }
        } else if (splitType === 'unequal') {
          formattedParticipants.forEach(p => {
            calculatedSplits.push({ userId: p.userId, amountOwed: Math.round(p.customAmount * rate * 100) / 100, metadata: { customAmount: p.customAmount } });
          });
        }

        // DB Insert
        const expInsert = await client.query(
          `INSERT INTO expenses (group_id, description, amount_inr, original_amount, original_currency, conversion_rate, split_type, paid_by, expense_date, notes, import_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [groupId, row.raw.description, amountInr, row.amount_parsed, row.currency_parsed, rate, splitType, payerOverride, dateOverride, row.raw.notes || null, 'imported']
        );
        const newExpenseId = expInsert.rows[0].id;

        for (const split of calculatedSplits) {
          await client.query(
            `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
             VALUES ($1, $2, $3)`,
            [newExpenseId, split.userId, split.amountOwed]
          );

          if (Object.keys(split.metadata).length > 0) {
            await client.query(
              `INSERT INTO split_metadata (expense_id, user_id, percentage_value, share_value, custom_amount)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                newExpenseId,
                split.userId,
                split.metadata.percentage || null,
                split.metadata.shares || null,
                split.metadata.customAmount || null
              ]
            );
          }
        }

        importedCount++;
        reportLogs.push(`Row ${rowNum}: Expense '${row.raw.description}' successfully imported.`);
      }

      // Add to SQL logs
      await client.query(
        `INSERT INTO import_logs (row_number, problem_type, description, action_taken)
         VALUES ($1, $2, $3, $4)`,
        [rowNum, row.anomalies.map(a => a.type).join(', ') || 'none', row.raw.description, res ? res.action : 'imported_clean']
      );
    }
  });

  // Clean up session cache
  importSessions.delete(importSessionId);

  return {
    success: true,
    imported_count: importedCount,
    skipped_count: skippedCount,
    report: {
      summary: {
        total: scannedData.length,
        imported: importedCount,
        skipped: skippedCount,
        warnings: warningCount,
        errors: errorCount
      },
      logs: reportLogs
    }
  };
}
