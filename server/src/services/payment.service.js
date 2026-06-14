import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';

export async function createPayment(data) {
  const { groupId, paidBy, paidTo, amount, paymentDate, notes } = data;

  if (!groupId || !paidBy || !paidTo || !amount || !paymentDate) {
    throw new Error('Missing required fields for recording payment.');
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Settlement amount must be a positive number.');
  }

  if (paidBy === paidTo) {
    throw new Error('Sender and recipient must be different members.');
  }

  return await withTransaction(async (client) => {
    // We do NOT block payments if active membership changed (as decided in Phase 4),
    // but we verify that both users are associated with the group membership records.
    const senderCheck = await client.query(
      'SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, paidBy]
    );
    const recipientCheck = await client.query(
      'SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, paidTo]
    );

    if (senderCheck.rows.length === 0 || recipientCheck.rows.length === 0) {
      throw new Error('Both sender and recipient must belong to this group.');
    }

    const res = await client.query(
      `INSERT INTO payments (group_id, paid_by, paid_to, amount, payment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, group_id, paid_by, paid_to, amount, payment_date, notes`,
      [groupId, paidBy, paidTo, numericAmount, paymentDate, notes || null]
    );

    return res.rows[0];
  });
}

export async function getPaymentsForGroup(groupId) {
  const res = await pool.query(
    `SELECT p.id, p.group_id, p.paid_by, u1.name as paid_by_name,
            p.paid_to, u2.name as paid_to_name, p.amount, p.payment_date, p.notes, p.created_at
     FROM payments p
     JOIN users u1 ON u1.id = p.paid_by
     JOIN users u2 ON u2.id = p.paid_to
     WHERE p.group_id = $1
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    [groupId]
  );
  return res.rows;
}
