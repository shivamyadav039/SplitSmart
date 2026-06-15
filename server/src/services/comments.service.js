import { pool } from '../db/pool.js';

export async function getCommentsForExpense(expenseId) {
  const queryText = `
    SELECT ec.id, ec.expense_id, ec.user_id, ec.message, ec.created_at, u.name as user_name, u.email as user_email
    FROM expense_comments ec
    JOIN users u ON ec.user_id = u.id
    WHERE ec.expense_id = $1
    ORDER BY ec.created_at ASC
  `;
  const res = await pool.query(queryText, [expenseId]);
  return res.rows;
}

export async function createComment(expenseId, userId, message) {
  if (!message || !message.trim()) {
    throw new Error('Message content cannot be empty.');
  }

  // 1. Insert comment
  const insertText = `
    INSERT INTO expense_comments (expense_id, user_id, message)
    VALUES ($1, $2, $3)
    RETURNING id, expense_id, user_id, message, created_at
  `;
  const res = await pool.query(insertText, [expenseId, userId, message]);
  const comment = res.rows[0];

  // 2. Fetch user name to attach
  const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
  comment.user_name = userRes.rows[0]?.name || 'Unknown User';

  return comment;
}
