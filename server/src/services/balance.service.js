import { pool } from '../db/pool.js';
import { getGroupMembers } from './group.service.js';

/**
 * Calculates net pairwise balances for a group.
 * Returns a list of simplified debts: "Who owes whom and how much" (INR).
 */
export async function getGroupBalances(groupId) {
  // 1. Fetch group members
  const members = await getGroupMembers(groupId);
  const memberMap = {};
  members.forEach(m => {
    memberMap[m.user_id] = m.name;
  });

  // 2. Fetch all expenses paid and owed shares
  // Creditor is the payer. Debtor is the participant who owes.
  const expensesQuery = `
    SELECT e.paid_by as creditor, es.user_id as debtor, SUM(es.amount_owed) as total_amount
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = $1 AND e.paid_by <> es.user_id
    GROUP BY e.paid_by, es.user_id
  `;
  const expensesRes = await pool.query(expensesQuery, [groupId]);

  // 3. Fetch all payments (settlements)
  // Payer is the debtor. Recipient is the creditor.
  const paymentsQuery = `
    SELECT paid_by as debtor, paid_to as creditor, SUM(amount) as total_amount
    FROM payments
    WHERE group_id = $1
    GROUP BY paid_by, paid_to
  `;
  const paymentsRes = await pool.query(paymentsQuery, [groupId]);

  // 4. Initialize a balance matrix: balances[userA][userB] is what userB owes userA net
  const memberIds = members.map(m => m.user_id);
  const balances = {};
  
  memberIds.forEach(id1 => {
    balances[id1] = {};
    memberIds.forEach(id2 => {
      balances[id1][id2] = 0;
    });
  });

  // Add expense debts (debtor owes creditor)
  expensesRes.rows.forEach(row => {
    const creditor = row.creditor;
    const debtor = row.debtor;
    const amount = parseFloat(row.total_amount);
    if (balances[creditor] && balances[creditor].hasOwnProperty(debtor)) {
      balances[creditor][debtor] += amount;
    }
  });

  // Subtract payments (debtor paid creditor, reducing what debtor owes creditor)
  paymentsRes.rows.forEach(row => {
    const debtor = row.debtor;
    const creditor = row.creditor;
    const amount = parseFloat(row.total_amount);
    if (balances[creditor] && balances[creditor].hasOwnProperty(debtor)) {
      balances[creditor][debtor] -= amount;
    }
  });

  // 5. Net out the balances between each pair A and B
  const debts = [];
  const processedPairs = new Set();

  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const u1 = memberIds[i];
      const u2 = memberIds[j];

      const u2OwesU1 = balances[u1][u2]; // what u2 owes u1
      const u1OwesU2 = balances[u2][u1]; // what u1 owes u2

      const net = u2OwesU1 - u1OwesU2;
      const roundedNet = Math.round(net * 100) / 100;

      if (roundedNet > 0.01) {
        // u2 owes u1
        debts.push({
          debtor_id: u2,
          debtor_name: memberMap[u2],
          creditor_id: u1,
          creditor_name: memberMap[u1],
          amount: roundedNet
        });
      } else if (roundedNet < -0.01) {
        // u1 owes u2
        debts.push({
          debtor_id: u1,
          debtor_name: memberMap[u1],
          creditor_id: u2,
          creditor_name: memberMap[u2],
          amount: Math.abs(roundedNet)
        });
      }
    }
  }

  // Calculate overall net balance summary per user for Aisha's header card
  const userNetSummaries = {};
  memberIds.forEach(id => {
    userNetSummaries[id] = {
      user_id: id,
      name: memberMap[id],
      net_balance: 0
    };
  });

  debts.forEach(d => {
    userNetSummaries[d.debtor_id].net_balance -= d.amount;
    userNetSummaries[d.creditor_id].net_balance += d.amount;
  });

  // Round values
  Object.keys(userNetSummaries).forEach(id => {
    userNetSummaries[id].net_balance = Math.round(userNetSummaries[id].net_balance * 100) / 100;
  });

  return {
    debts,
    summaries: Object.values(userNetSummaries)
  };
}

/**
 * Returns Rohan's itemized audit trail between two specific users (userId1 and userId2).
 * Shows exactly what transactions and payments make up the balance.
 */
export async function getPairwiseAuditTrail(groupId, userId1, userId2) {
  // Fetch expenses involving both users (either one paid and other participated, or vice-versa)
  const expensesQuery = `
    SELECT e.id, 'expense' as type, e.description, e.expense_date as date, 
           e.amount_inr as total_amount, e.original_amount, e.original_currency, 
           e.paid_by, u.name as paid_by_name, es.amount_owed as user_share
    FROM expenses e
    JOIN expense_splits es ON es.expense_id = e.id
    JOIN users u ON u.id = e.paid_by
    WHERE e.group_id = $1 
      AND (
        (e.paid_by = $2 AND es.user_id = $3)
        OR 
        (e.paid_by = $3 AND es.user_id = $2)
      )
  `;
  const expensesRes = await pool.query(expensesQuery, [groupId, userId1, userId2]);

  // Fetch payments between both users
  const paymentsQuery = `
    SELECT p.id, 'payment' as type, 'Payment settlement' as description, p.payment_date as date,
           p.amount as total_amount, p.amount as original_amount, 'INR' as original_currency,
           p.paid_by, u.name as paid_by_name, p.amount as user_share
    FROM payments p
    JOIN users u ON u.id = p.paid_by
    WHERE p.group_id = $1
      AND (
        (p.paid_by = $2 AND p.paid_to = $3)
        OR
        (p.paid_by = $3 AND p.paid_to = $2)
      )
  `;
  const paymentsRes = await pool.query(paymentsQuery, [groupId, userId1, userId2]);

  // Merge lists
  const auditTrail = [...expensesRes.rows, ...paymentsRes.rows];

  // Sort chronologically (oldest to newest) to make audit tracing logical
  auditTrail.sort((a, b) => new Date(a.date) - new Date(b.date));

  return auditTrail;
}
