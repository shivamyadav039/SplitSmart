import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';

export async function getExpensesForGroup(groupId, filters = {}) {
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const { memberId, startDate, endDate } = filters;
  const queryParams = [groupId];
  let paramIndex = 2;

  // Base query conditions
  let conditions = 'WHERE e.group_id = $1';

  if (memberId) {
    queryParams.push(memberId);
    conditions += ` AND (e.paid_by = $${paramIndex} OR EXISTS (
      SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = $${paramIndex}
    ))`;
    paramIndex++;
  }

  if (startDate) {
    queryParams.push(startDate);
    conditions += ` AND e.expense_date >= $${paramIndex}`;
    paramIndex++;
  }

  if (endDate) {
    queryParams.push(endDate);
    conditions += ` AND e.expense_date <= $${paramIndex}`;
    paramIndex++;
  }

  // Count total matching items
  const countQuery = `
    SELECT COUNT(*) 
    FROM expenses e 
    ${conditions}
  `;
  const countRes = await pool.query(countQuery, queryParams);
  const totalItems = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(totalItems / limit);

  // Fetch paginated data
  const dataQuery = `
    SELECT e.id, e.description, e.amount_inr, e.original_amount, 
           e.original_currency, e.conversion_rate, e.split_type, 
           e.paid_by, u.name as paid_by_name, e.expense_date, e.notes, e.import_status, e.created_at
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    ${conditions}
    ORDER BY e.expense_date DESC, e.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  queryParams.push(limit, offset);
  const dataRes = await pool.query(dataQuery, queryParams);

  return {
    data: dataRes.rows,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages
    }
  };
}

export async function createExpense(data) {
  const {
    groupId,
    description,
    amount,
    currency,
    expenseDate,
    paidBy,
    splitType,
    participants
  } = data;

  if (!groupId || !description || !amount || !expenseDate || !paidBy || !splitType || !participants || participants.length === 0) {
    throw new Error('Missing required fields for creating expense.');
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Expense amount must be a positive number.');
  }

  // Get active members check
  return await withTransaction(async (client) => {
    // 1. Verify payer is active on expense date
    const payerCheck = await client.query(
      `SELECT id FROM group_memberships
       WHERE group_id = $1 AND user_id = $2
         AND joined_at <= $3
         AND (left_at IS NULL OR left_at >= $3)`,
      [groupId, paidBy, expenseDate]
    );
    if (payerCheck.rows.length === 0) {
      throw new Error('Payer was not an active member of the group on this date.');
    }

    // 2. Verify all participants are active on expense date
    for (const p of participants) {
      const partCheck = await client.query(
        `SELECT id FROM group_memberships
         WHERE group_id = $1 AND user_id = $2
           AND joined_at <= $3
           AND (left_at IS NULL OR left_at >= $3)`,
        [groupId, p.userId, expenseDate]
      );
      if (partCheck.rows.length === 0) {
        throw new Error(`One of the participants (User ID: ${p.userId}) was not active in the group on this date.`);
      }
    }

    // 3. Compute Conversions
    const rate = currency === 'USD' ? parseFloat(process.env.USD_TO_INR_RATE || 84) : 1.0000;
    const amountInr = Math.round(numericAmount * rate * 100) / 100; // round to 2 decimals

    // 4. Compute Splits and enforce Rounding rules
    const calculatedSplits = []; // Array of { userId, amountOwed, metadata: { percentage, share, customAmount } }
    
    if (splitType === 'equal') {
      const splitVal = amountInr / participants.length;
      let splitSum = 0;
      
      participants.forEach((p, idx) => {
        let val = Math.round(splitVal * 100) / 100;
        calculatedSplits.push({
          userId: p.userId,
          amountOwed: val,
          metadata: {}
        });
        splitSum += val;
      });

      // Adjust rounding remainder on final participant
      const remainder = Math.round((amountInr - splitSum) * 100) / 100;
      if (remainder !== 0) {
        calculatedSplits[calculatedSplits.length - 1].amountOwed = 
          Math.round((calculatedSplits[calculatedSplits.length - 1].amountOwed + remainder) * 100) / 100;
      }

    } else if (splitType === 'unequal') {
      let customSum = 0;
      participants.forEach((p) => {
        const customAmtVal = parseFloat(p.customAmount);
        if (isNaN(customAmtVal) || customAmtVal < 0) {
          throw new Error('Unequal split customAmount must be a positive number.');
        }
        
        // Convert to INR
        const customAmtInr = Math.round(customAmtVal * rate * 100) / 100;
        calculatedSplits.push({
          userId: p.userId,
          amountOwed: customAmtInr,
          metadata: { customAmount: customAmtVal }
        });
        customSum += customAmtVal;
      });

      // Validate sum matches total expense
      if (Math.abs(customSum - numericAmount) > 0.01) {
        throw new Error(`Unequal splits sum (${customSum}) must equal the total amount (${numericAmount}).`);
      }

    } else if (splitType === 'percentage') {
      let percentSum = 0;
      participants.forEach((p) => {
        const pct = parseFloat(p.percentage);
        if (isNaN(pct) || pct < 0) {
          throw new Error('Percentage must be a positive number.');
        }
        percentSum += pct;
      });

      if (Math.abs(percentSum - 100) > 0.01) {
        throw new Error('Percentage splits must sum to exactly 100%.');
      }

      let splitSum = 0;
      participants.forEach((p) => {
        const shareVal = Math.round((amountInr * (p.percentage / 100)) * 100) / 100;
        calculatedSplits.push({
          userId: p.userId,
          amountOwed: shareVal,
          metadata: { percentage: p.percentage }
        });
        splitSum += shareVal;
      });

      // Apply rounding remainder on final participant
      const remainder = Math.round((amountInr - splitSum) * 100) / 100;
      if (remainder !== 0) {
        calculatedSplits[calculatedSplits.length - 1].amountOwed = 
          Math.round((calculatedSplits[calculatedSplits.length - 1].amountOwed + remainder) * 100) / 100;
      }

    } else if (splitType === 'share') {
      let totalShares = 0;
      participants.forEach((p) => {
        const sh = parseInt(p.shares, 10);
        if (isNaN(sh) || sh <= 0) {
          throw new Error('Shares must be positive integers.');
        }
        totalShares += sh;
      });

      if (totalShares <= 0) {
        throw new Error('Total shares must be greater than 0.');
      }

      let splitSum = 0;
      participants.forEach((p) => {
        const shareVal = Math.round((amountInr * (p.shares / totalShares)) * 100) / 100;
        calculatedSplits.push({
          userId: p.userId,
          amountOwed: shareVal,
          metadata: { shares: p.shares }
        });
        splitSum += shareVal;
      });

      // Apply rounding remainder on final participant
      const remainder = Math.round((amountInr - splitSum) * 100) / 100;
      if (remainder !== 0) {
        calculatedSplits[calculatedSplits.length - 1].amountOwed = 
          Math.round((calculatedSplits[calculatedSplits.length - 1].amountOwed + remainder) * 100) / 100;
      }
    } else {
      throw new Error(`Unsupported split type: ${splitType}`);
    }

    // 5. Insert main Expense record
    const expenseRes = await client.query(
      `INSERT INTO expenses (group_id, description, amount_inr, original_amount, original_currency, conversion_rate, split_type, paid_by, expense_date, notes, import_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [groupId, description, amountInr, numericAmount, currency, rate, splitType, paidBy, expenseDate, data.notes || null, data.importStatus || 'manual']
    );
    const expenseId = expenseRes.rows[0].id;

    // 6. Insert Expense Splits and Metadata
    for (const split of calculatedSplits) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
         VALUES ($1, $2, $3)`,
        [expenseId, split.userId, split.amountOwed]
      );

      // Insert split metadata for transparency audit if weights exist
      if (Object.keys(split.metadata).length > 0) {
        await client.query(
          `INSERT INTO split_metadata (expense_id, user_id, percentage_value, share_value, custom_amount)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            expenseId,
            split.userId,
            split.metadata.percentage || null,
            split.metadata.shares || null,
            split.metadata.customAmount || null
          ]
        );
      }
    }

    return { id: expenseId, success: true };
  });
}

export async function deleteExpense(expenseId) {
  await pool.query('DELETE FROM expenses WHERE id = $1', [expenseId]);
  return { success: true };
}
