import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';

export async function getGroupsForUser(userId) {
  const res = await pool.query(
    `SELECT g.id, g.name, g.created_at
     FROM groups g
     JOIN group_memberships gm ON gm.group_id = g.id
     WHERE gm.user_id = $1`,
    [userId]
  );
  return res.rows;
}

export async function createGroup(name, creatorUserId) {
  if (!name) {
    throw new Error('Group name is required.');
  }

  return await withTransaction(async (client) => {
    // Insert group
    const groupRes = await client.query(
      `INSERT INTO groups (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_at`,
      [name, creatorUserId]
    );
    const group = groupRes.rows[0];

    // Add creator as member immediately (joined today by default)
    const today = new Date().toISOString().split('T')[0];
    await client.query(
      `INSERT INTO group_memberships (group_id, user_id, joined_at)
       VALUES ($1, $2, $3)`,
      [group.id, creatorUserId, today]
    );

    return group;
  });
}

export async function getGroupMembers(groupId) {
  const res = await pool.query(
    `SELECT gm.id as membership_id, u.id as user_id, u.name, u.email, gm.joined_at, gm.left_at
     FROM group_memberships gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY u.name ASC`,
    [groupId]
  );
  return res.rows;
}

export async function addOrUpdateGroupMember(groupId, memberName, joinedAt, leftAt) {
  if (!memberName || !joinedAt) {
    throw new Error('Member name and joined date are required.');
  }

  return await withTransaction(async (client) => {
    // Find if user already exists
    let userRes = await client.query('SELECT id FROM users WHERE name = $1', [memberName]);
    let userId;

    if (userRes.rows.length === 0) {
      // Create a dummy user for them
      const email = `${memberName.toLowerCase().replace(/\s+/g, '')}@demo.com`;
      // Hash dummy password
      const dummyPassword = await import('bcryptjs').then(m => m.default.hash('demo123', 10));
      
      const insertUserRes = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [memberName, email, dummyPassword]
      );
      userId = insertUserRes.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
    }

    // Check if membership already exists in this group
    const membershipRes = await client.query(
      'SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (membershipRes.rows.length > 0) {
      // Update existing membership dates
      await client.query(
        `UPDATE group_memberships
         SET joined_at = $1, left_at = $2
         WHERE group_id = $3 AND user_id = $4`,
        [joinedAt, leftAt || null, groupId, userId]
      );
    } else {
      // Create new membership record
      await client.query(
        `INSERT INTO group_memberships (group_id, user_id, joined_at, left_at)
         VALUES ($1, $2, $3, $4)`,
        [groupId, userId, joinedAt, leftAt || null]
      );
    }

    return { success: true };
  });
}

export async function removeGroupMember(groupId, userId) {
  // Check if member has expenses or splits associated before deleting to avoid referential errors
  const expenseCheck = await pool.query(
    `SELECT COUNT(*) FROM expenses WHERE group_id = $1 AND paid_by = $2`,
    [groupId, userId]
  );
  const splitsCheck = await pool.query(
    `SELECT COUNT(*) FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = $1 AND es.user_id = $2`,
    [groupId, userId]
  );

  const hasExpenses = parseInt(expenseCheck.rows[0].count, 10) > 0;
  const hasSplits = parseInt(splitsCheck.rows[0].count, 10) > 0;

  if (hasExpenses || hasSplits) {
    throw new Error(
      'Cannot remove member. They have associated expenses or splits. Update their leave date instead.'
    );
  }

  await pool.query(
    'DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return { success: true };
}
