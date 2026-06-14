import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import { createExpense } from '../services/expense.service.js';
import { addOrUpdateGroupMember } from '../services/group.service.js';
import { parseCSVDate, parseCSVAmount } from '../services/anomaly.service.js';

describe('ExpenseSync Ledger Math & Parser Tests', () => {
  let testGroupId;
  let userA, userB, userC, userD;

  beforeAll(async () => {
    // 1. Setup clean test group and users
    const groupRes = await pool.query(
      `INSERT INTO groups (name) VALUES ('Test Math Group') RETURNING id`
    );
    testGroupId = groupRes.rows[0].id;

    // Insert test users
    const users = ['A', 'B', 'C', 'D'];
    const userIds = [];
    for (const u of users) {
      const res = await pool.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, 'dummy')
         RETURNING id`,
        [`User${u}`, `user${u.toLowerCase()}@test.com`]
      );
      userIds.push(res.rows[0].id);
    }
    
    [userA, userB, userC, userD] = userIds;

    // Set memberships timelines:
    // UserA, UserB, UserC: Active from Feb 1st
    // UserD: Active from March 1st to March 31st (Inactive in April)
    await pool.query(
      `INSERT INTO group_memberships (group_id, user_id, joined_at, left_at)
       VALUES 
        ($1, $2, '2026-02-01', null),
        ($1, $3, '2026-02-01', null),
        ($1, $4, '2026-02-01', null),
        ($1, $5, '2026-03-01', '2026-03-31')`,
      [testGroupId, userA, userB, userC, userD]
    );
  });

  afterAll(async () => {
    // Cleanup database
    await pool.query('DELETE FROM groups WHERE id = $1', [testGroupId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [userA, userB, userC, userD]);
    await pool.end();
  });

  it('Verify CSV number formatting parser normalization', () => {
    expect(parseCSVAmount('"1,200"')).toBe(1200);
    expect(parseCSVAmount('899.995')).toBe(899.995);
  });

  it('Verify date parsing formats and ambiguity flags', () => {
    const r1 = parseCSVDate('Mar-14');
    expect(r1.parsedDate.getMonth()).toBe(2); // March is index 2
    expect(r1.isAmbiguous).toBe(false);

    const r2 = parseCSVDate('04-05-2026');
    expect(r2.isAmbiguous).toBe(true); // both day and month <= 12
  });

  it('Equal split rounding remainders are correctly routed to prevent balance leakage', async () => {
    // 1000 INR divided among 3 users (UserA, UserB, UserC)
    // 1000 / 3 = 333.33 each, remainder 0.01 added to the last participant -> 333.34
    const res = await createExpense({
      groupId: testGroupId,
      description: 'Dinner test',
      amount: 1000.00,
      currency: 'INR',
      expenseDate: '2026-02-15',
      paidBy: userA,
      splitType: 'equal',
      participants: [
        { userId: userA },
        { userId: userB },
        { userId: userC }
      ]
    });

    expect(res.success).toBe(true);

    const splitsRes = await pool.query(
      `SELECT user_id, amount_owed FROM expense_splits WHERE expense_id = $1 ORDER BY amount_owed ASC`,
      [res.id]
    );
    
    expect(splitsRes.rows.length).toBe(3);
    // Verifying division rounding + final participant receives remainder
    expect(parseFloat(splitsRes.rows[0].amount_owed)).toBe(333.33);
    expect(parseFloat(splitsRes.rows[1].amount_owed)).toBe(333.33);
    expect(parseFloat(splitsRes.rows[2].amount_owed)).toBe(333.34);

    const sumRes = await pool.query(
      `SELECT SUM(amount_owed) FROM expense_splits WHERE expense_id = $1`,
      [res.id]
    );
    expect(parseFloat(sumRes.rows[0].sum)).toBe(1000.00);
  });

  it('USD currency converts correctly to INR using snapshot conversion rate', async () => {
    // Goa Villa: $540 USD converted using rate 84 -> ₹45,360 INR
    process.env.USD_TO_INR_RATE = '84';
    
    const res = await createExpense({
      groupId: testGroupId,
      description: 'Goa villa booking test',
      amount: 540.00,
      currency: 'USD',
      expenseDate: '2026-03-09',
      paidBy: userA,
      splitType: 'equal',
      participants: [
        { userId: userA },
        { userId: userB }
      ]
    });

    expect(res.success).toBe(true);

    const expRes = await pool.query(
      `SELECT amount_inr, conversion_rate FROM expenses WHERE id = $1`,
      [res.id]
    );
    expect(parseFloat(expRes.rows[0].amount_inr)).toBe(45360.00);
    expect(parseFloat(expRes.rows[0].conversion_rate)).toBe(84.0000);
  });

  it('Share-based splits allocate correctly according to weights', async () => {
    // ₹1800 split 3:2:1 among UserA, UserB, UserC
    // Total shares = 6. Split values: 900, 600, 300
    const res = await createExpense({
      groupId: testGroupId,
      description: 'Shares test',
      amount: 1800.00,
      currency: 'INR',
      expenseDate: '2026-02-28',
      paidBy: userA,
      splitType: 'share',
      participants: [
        { userId: userA, shares: 3 },
        { userId: userB, shares: 2 },
        { userId: userC, shares: 1 }
      ]
    });

    expect(res.success).toBe(true);

    const splitsRes = await pool.query(
      `SELECT user_id, amount_owed FROM expense_splits WHERE expense_id = $1`,
      [res.id]
    );

    const splitMap = {};
    splitsRes.rows.forEach(r => {
      splitMap[r.user_id] = parseFloat(r.amount_owed);
    });

    expect(splitMap[userA]).toBe(900.00);
    expect(splitMap[userB]).toBe(600.00);
    expect(splitMap[userC]).toBe(300.00);
  });

  it('Membership timeline eligibility checks reject inactive user splits', async () => {
    // UserD left on March 31st. An expense logged on April 15th cannot split with UserD.
    await expect(
      createExpense({
        groupId: testGroupId,
        description: 'April groceries',
        amount: 2000.00,
        currency: 'INR',
        expenseDate: '2026-04-15',
        paidBy: userA,
        splitType: 'equal',
        participants: [
          { userId: userA },
          { userId: userD } // Inactive!
        ]
      })
    ).rejects.toThrow('was not active in the group on this date');
  });
});
