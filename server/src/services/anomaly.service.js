import { pool } from '../db/pool.js';

/**
 * Calculates Jaccard token similarity between two description strings.
 */
function getDescriptionSimilarity(desc1, desc2) {
  if (!desc1 || !desc2) return 0;
  const tokens1 = new Set(desc1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const tokens2 = new Set(desc2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return intersection.size / union.size;
}

/**
 * Attempts to parse date from string using common formats.
 * Returns { parsedDate: Date|null, format: string|null, isAmbiguous: boolean }
 */
export function parseCSVDate(dateStr) {
  if (!dateStr) return { parsedDate: null, format: null, isAmbiguous: false };
  
  const trimmed = dateStr.trim();
  
  // Format: Mar-14, Mar-14-2026 or similar
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // Case 1: Mar-14 (implies current year, or Goa trip year 2026 based on context)
  const monthDayMatch = trimmed.match(/^([A-Za-z]+)-(\d+)$/);
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].toLowerCase().substring(0, 3);
    const day = parseInt(monthDayMatch[2], 10);
    if (monthMap.hasOwnProperty(monthName) && day >= 1 && day <= 31) {
      // Return March 14, 2026 (Goa trip is in 2026)
      const date = new Date(2026, monthMap[monthName], day);
      return { parsedDate: date, format: 'MMM-DD', isAmbiguous: false };
    }
  }

  // Case 2: DD-MM-YYYY or MM-DD-YYYY or YYYY-MM-DD
  const parts = trimmed.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    // YYYY-MM-DD
    if (parts[0].length === 4) {
      const date = new Date(p0, p1 - 1, p2);
      return { parsedDate: date, format: 'YYYY-MM-DD', isAmbiguous: false };
    }

    // DD-MM-YYYY or MM-DD-YYYY
    if (p0 <= 31 && p1 <= 31) {
      // Ambiguity check: if both day and month <= 12, we can't be sure without user choice
      if (p0 <= 12 && p1 <= 12 && p0 !== p1) {
        // Assume DD-MM-YYYY as standard but flag ambiguity
        const date = new Date(p2, p1 - 1, p0);
        return { parsedDate: date, format: 'DD-MM-YYYY', isAmbiguous: true };
      }
      
      // Standard DD-MM-YYYY (p0 is day since p1 is > 12)
      if (p1 > 12) {
        const date = new Date(p2, p1 - 1, p0);
        return { parsedDate: date, format: 'DD-MM-YYYY', isAmbiguous: false };
      }
      
      // Standard MM-DD-YYYY (p0 is month since p0 <= 12 and p1 > 12)
      if (p0 > 12) {
        const date = new Date(p2, p0 - 1, p1);
        return { parsedDate: date, format: 'MM-DD-YYYY', isAmbiguous: false };
      }

      // Default fallback
      const date = new Date(p2, p1 - 1, p0);
      return { parsedDate: date, format: 'DD-MM-YYYY', isAmbiguous: false };
    }
  }

  // Fallback to standard JS parser
  const jsDate = new Date(trimmed);
  if (!isNaN(jsDate.getTime())) {
    return { parsedDate: jsDate, format: 'JS_DEFAULT', isAmbiguous: false };
  }

  return { parsedDate: null, format: null, isAmbiguous: false };
}

/**
 * Normalizes number formats (strips commas, quotes, spaces)
 */
export function parseCSVAmount(amountStr) {
  if (!amountStr) return 0;
  const clean = amountStr.replace(/["',]/g, '').trim();
  const amt = parseFloat(clean);
  return isNaN(amt) ? 0 : amt;
}

/**
 * Scan all parsed CSV rows and detect anomalies.
 */
export async function detectAnomalies(groupId, parsedRows) {
  // Fetch database users and active memberships
  const usersRes = await pool.query('SELECT id, name, email FROM users');
  const dbUsers = usersRes.rows;
  const dbUserNames = dbUsers.map(u => u.name.toLowerCase());
  const dbUserMap = {}; // name.toLowerCase() -> user info
  dbUsers.forEach(u => {
    dbUserMap[u.name.toLowerCase()] = u;
  });

  const membershipsRes = await pool.query(
    'SELECT user_id, joined_at, left_at FROM group_memberships WHERE group_id = $1',
    [groupId]
  );
  const dbMemberships = membershipsRes.rows;
  const dbMembershipMap = {}; // user_id -> membership info
  dbMemberships.forEach(m => {
    dbMembershipMap[m.user_id] = m;
  });

  // Fetch existing database expenses to match duplicates
  const existingExpensesRes = await pool.query(
    `SELECT e.id, e.description, e.amount_inr, e.original_amount, 
            e.original_currency, e.paid_by, u.name as paid_by_name, e.expense_date
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
     WHERE e.group_id = $1`,
    [groupId]
  );
  const dbExpenses = existingExpensesRes.rows;

  const results = [];

  for (let idx = 0; idx < parsedRows.length; idx++) {
    const row = parsedRows[idx];
    const rowNumber = idx + 2; // 1-based index + header row offset
    const anomalies = [];

    // Fields extraction
    const rawDate = row.date || '';
    const rawDesc = row.description || '';
    const rawPayer = row.paid_by || '';
    const rawAmt = row.amount || '';
    const rawCurrency = row.currency || '';
    const rawSplitType = row.split_type || 'equal';
    const rawSplitWith = row.split_with || '';
    const rawSplitDetails = row.split_details || '';
    const rawNotes = row.notes || '';

    // 1. Amount Check & Formatting (Anomaly 3)
    const amountVal = parseCSVAmount(rawAmt);
    if (rawAmt.includes(',') || rawAmt.includes('"') || rawAmt.includes("'")) {
      anomalies.push({
        type: 'number_formatting',
        description: `Amount '${rawAmt}' contains inconsistent number formatting characters. Auto-normalized to ${amountVal}.`,
        severity: 'warning',
        action: 'auto_fix'
      });
    }

    // 2. Zero amount check (Anomaly 13)
    if (amountVal === 0) {
      anomalies.push({
        type: 'zero_amount',
        description: `Expense has zero value.`,
        severity: 'warning',
        options: ['skip', 'import_zero']
      });
    }

    // 3. Negative amount check (Anomaly 10)
    if (amountVal < 0) {
      anomalies.push({
        type: 'negative_amount',
        description: `Refund logged as negative expense. Will reduce participants owed balances.`,
        severity: 'warning',
        action: 'auto_fix'
      });
    }

    // 4. Currency check (Anomaly 12)
    let currencyVal = rawCurrency.trim().toUpperCase();
    if (!currencyVal) {
      currencyVal = 'INR';
      anomalies.push({
        type: 'missing_currency',
        description: `Currency column is empty. Defaulting to INR.`,
        severity: 'warning',
        action: 'auto_fix'
      });
    }

    // 5. Date Parsing & Ambiguity check (Anomaly 11)
    const { parsedDate, format, isAmbiguous } = parseCSVDate(rawDate);
    let dateStr = null;
    
    if (!parsedDate) {
      anomalies.push({
        type: 'invalid_date',
        description: `Could not parse date '${rawDate}'. Please specify YYYY-MM-DD.`,
        severity: 'error',
        options: ['select_date', 'skip']
      });
    } else {
      dateStr = parsedDate.toISOString().split('T')[0];
      if (format !== 'YYYY-MM-DD' && format !== 'DD-MM-YYYY') {
        anomalies.push({
          type: 'messy_date_format',
          description: `Messy date format '${rawDate}' parsed as ${dateStr}.`,
          severity: 'warning',
          action: 'auto_fix'
        });
      }
      if (isAmbiguous) {
        // e.g. 04-05-2026 could be April 5 or May 4
        // Format both choices
        const parts = rawDate.split(/[-/.]/);
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        const choice1 = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // DD-MM-YYYY assumption
        const choice2 = `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`; // MM-DD-YYYY assumption

        anomalies.push({
          type: 'ambiguous_date',
          description: `Date '${rawDate}' is ambiguous. Select correct date:`,
          severity: 'error',
          options: ['select_date', 'skip'],
          choices: [choice1, choice2]
        });
      }
    }

    // 6. Missing Payer (Anomaly 6)
    let payerVal = rawPayer.trim();
    let payerUserId = null;
    if (!payerVal) {
      anomalies.push({
        type: 'missing_payer',
        description: `Payer (paid_by) field is empty.`,
        severity: 'error',
        options: ['assign_payer', 'skip']
      });
    } else {
      // Trimming & Casing checks (Anomaly 4)
      const cleanPayerName = payerVal.trim();
      const lowerPayer = cleanPayerName.toLowerCase();
      
      if (dbUserMap[lowerPayer]) {
        payerUserId = dbUserMap[lowerPayer].id;
        
        if (cleanPayerName !== dbUserMap[lowerPayer].name) {
          anomalies.push({
            type: 'inconsistent_casing',
            description: `Payer name casing '${payerVal}' normalized to '${dbUserMap[lowerPayer].name}'.`,
            severity: 'warning',
            action: 'auto_fix'
          });
        }
      } else {
        // Try typo checks (Anomaly 5)
        const matched = dbUsers.find(u => u.name.toLowerCase().startsWith(lowerPayer.substring(0, 3)));
        if (matched) {
          anomalies.push({
            type: 'alternate_name',
            description: `Payer name '${payerVal}' does not match existing user. Map to '${matched.name}'?`,
            severity: 'error',
            options: ['map_member', 'add_member', 'skip'],
            suggestedUser: matched
          });
        } else {
          anomalies.push({
            type: 'unknown_member',
            description: `Payer name '${payerVal}' is not in database.`,
            severity: 'error',
            options: ['add_member', 'map_member', 'skip']
          });
        }
      }
    }

    // 7. Settlement mixed with Expenses (Anomaly 7)
    const descriptionLower = rawDesc.toLowerCase();
    const isSettlementDesc = descriptionLower.includes('paid back') || 
                             descriptionLower.includes('settle') || 
                             descriptionLower.includes('payment');
    
    // Check if it is a settlement: empty split_type and split_with is single participant
    const participantsClean = rawSplitWith.split(';').map(p => p.trim()).filter(Boolean);
    const isSettlement = isSettlementDesc || (!rawSplitType && participantsClean.length === 1);

    if (isSettlement) {
      anomalies.push({
        type: 'settlement_entry',
        description: `Record '${rawDesc}' matches a settlement payment instead of shared expense.`,
        severity: 'warning',
        options: ['import_as_settlement', 'import_as_expense', 'skip']
      });
    }

    // 8. Non-group member in splits (Anomaly 9) & Active period membership rules (Anomaly 14)
    const finalParticipants = [];
    
    for (const name of participantsClean) {
      const lowerName = name.toLowerCase();
      if (dbUserMap[lowerName]) {
        const userId = dbUserMap[lowerName].id;
        finalParticipants.push({ userId, name: dbUserMap[lowerName].name });
        
        // Active membership check (Anomaly 14)
        if (dateStr) {
          const membership = dbMembershipMap[userId];
          if (membership) {
            const joined = new Date(membership.joined_at);
            const left = membership.left_at ? new Date(membership.left_at) : null;
            const expDate = new Date(dateStr);

            if (expDate < joined || (left && expDate > left)) {
              anomalies.push({
                type: 'inactive_member',
                description: `Member '${dbUserMap[lowerName].name}' was inactive on expense date ${dateStr}.`,
                severity: 'warning',
                options: ['keep_member', 'exclude_member', 'skip'],
                userId
              });
            }
          }
        }
      } else {
        // Unknown participant
        anomalies.push({
          type: 'non_group_member',
          description: `Participant '${name}' is not in the group member list.`,
          severity: 'error',
          options: ['add_member', 'map_member', 'skip'],
          memberName: name
        });
      }
    }

    // 9. Splits Math Checks: percentages sum (Anomaly 8)
    if (rawSplitType === 'percentage' && rawSplitDetails) {
      const details = rawSplitDetails.split(';').map(d => d.trim()).filter(Boolean);
      let pctSum = 0;
      details.forEach(det => {
        const match = det.match(/(\d+)%/);
        if (match) {
          pctSum += parseFloat(match[1]);
        }
      });
      if (pctSum !== 100 && details.length > 0) {
        anomalies.push({
          type: 'invalid_percentage',
          description: `Split percentages sum to ${pctSum}% instead of 100%.`,
          severity: 'error',
          options: ['normalize_percentages', 'skip']
        });
      }
    }

    // 10. Split details for equal split (Anomaly 15)
    if (rawSplitType === 'equal' && rawSplitDetails) {
      anomalies.push({
        type: 'equal_split_details',
        description: `Split details provided for Equal split type. Auto-ignoring details and sharing equally.`,
        severity: 'warning',
        action: 'auto_fix'
      });
    }

    // 11. Duplicate Logs check (Anomaly 1 & Anomaly 2)
    // Check against database expenses and previous CSV rows
    if (dateStr && amountVal > 0) {
      // Database check
      const dbMatch = dbExpenses.find(e => {
        const matchesDate = e.expense_date.toISOString().split('T')[0] === dateStr;
        const matchesAmount = Math.abs(parseFloat(e.amount_inr) - (amountVal * (currencyVal === 'USD' ? 84 : 1))) < 0.01;
        return matchesDate && matchesAmount;
      });

      if (dbMatch) {
        const similarity = getDescriptionSimilarity(rawDesc, dbMatch.description);
        if (similarity >= 0.85) {
          anomalies.push({
            type: 'duplicate',
            description: `Row matches database expense '${dbMatch.description}' exactly.`,
            severity: 'warning',
            options: ['skip', 'keep_both']
          });
        } else {
          anomalies.push({
            type: 'conflicting_duplicate',
            description: `Same amount and date as database expense '${dbMatch.description}', but descriptions differ.`,
            severity: 'warning',
            options: ['keep_original', 'keep_new', 'keep_both']
          });
        }
      }

      // Check against previous rows in this import batch
      for (let prevIdx = 0; prevIdx < results.length; prevIdx++) {
        const prevRow = results[prevIdx];
        if (prevRow.date_parsed === dateStr && prevRow.amount_parsed === amountVal) {
          const similarity = getDescriptionSimilarity(rawDesc, prevRow.raw.description);
          if (similarity >= 0.85) {
            anomalies.push({
              type: 'duplicate',
              description: `Identical row duplicate of row ${prevRow.rowNumber} (${prevRow.raw.description}).`,
              severity: 'warning',
              options: ['keep_first', 'keep_second', 'keep_both']
            });
          }
        }
      }
    }

    // Sort anomalies to make sure errors come before warnings
    anomalies.sort((a, b) => {
      if (a.severity === 'error' && b.severity !== 'error') return -1;
      if (a.severity !== 'error' && b.severity === 'error') return 1;
      return 0;
    });

    // Push row results
    results.push({
      rowNumber,
      raw: row,
      amount_parsed: amountVal,
      date_parsed: dateStr,
      payer_id: payerUserId,
      currency_parsed: currencyVal,
      participants_parsed: finalParticipants,
      anomalies
    });
  }

  return results;
}
