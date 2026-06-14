import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { withTransaction } from './transaction.js';

async function seed() {
  console.log('Starting database seeding...');

  try {
    // 1. Check if database is already seeded
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCheck.rows[0].count, 10);
    if (userCount > 0) {
      console.log('Database already has users. Skipping seeding to prevent duplication.');
      return;
    }

    await withTransaction(async (client) => {
      console.log('Inserting seed users...');
      
      // Hash password
      const passwordHash = await bcrypt.hash('demo123', 10);
      
      const usersToInsert = [
        { name: 'Aisha', email: 'aisha@demo.com' },
        { name: 'Rohan', email: 'rohan@demo.com' },
        { name: 'Priya', email: 'priya@demo.com' },
        { name: 'Sam', email: 'sam@demo.com' },
        { name: 'Meera', email: 'meera@demo.com' },
        { name: 'Dev', email: 'dev@demo.com' }
      ];

      const userMap = {}; // Maps user name to UUID

      for (const u of usersToInsert) {
        const res = await client.query(
          `INSERT INTO users (name, email, password_hash)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [u.name, u.email, passwordHash]
        );
        userMap[u.name] = res.rows[0].id;
      }

      console.log('Creating primary group: Flatmates Group...');
      const groupRes = await client.query(
        `INSERT INTO groups (name, created_by)
         VALUES ($1, $2)
         RETURNING id`,
        ['Flatmates Group', userMap['Aisha']]
      );
      const groupId = groupRes.rows[0].id;

      console.log('Adding group memberships with chronological active dates...');
      const memberships = [
        { name: 'Aisha', joined: '2026-02-01', left: null },
        { name: 'Rohan', joined: '2026-02-01', left: null },
        { name: 'Priya', joined: '2026-02-01', left: null },
        { name: 'Meera', joined: '2026-02-01', left: '2026-03-31' },
        { name: 'Dev', joined: '2026-03-10', left: null },
        { name: 'Sam', joined: '2026-04-15', left: null }
      ];

      for (const m of memberships) {
        await client.query(
          `INSERT INTO group_memberships (group_id, user_id, joined_at, left_at)
           VALUES ($1, $2, $3, $4)`,
          [groupId, userMap[m.name], m.joined, m.left]
        );
      }

      console.log('Inserting initial sample expenses and splits...');
      
      // Seed Expense 1: Feb Rent (Equal split Aisha, Rohan, Priya, Meera)
      // Total: 48,000 INR
      const rentRes = await client.query(
        `INSERT INTO expenses (group_id, description, amount_inr, original_amount, original_currency, conversion_rate, split_type, paid_by, expense_date, notes, import_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [groupId, 'February rent', 48000.00, 48000.00, 'INR', 1.0000, 'equal', userMap['Aisha'], '2026-02-01', 'Rent for Feb shared equally', 'manual']
      );
      const rentId = rentRes.rows[0].id;
      const rentSplitAmount = 48000.00 / 4;
      const rentParticipants = ['Aisha', 'Rohan', 'Priya', 'Meera'];
      for (const p of rentParticipants) {
        await client.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
           VALUES ($1, $2, $3)`,
          [rentId, userMap[p], rentSplitAmount]
        );
      }

      // Seed Expense 2: Wifi bill Feb (Paid by Rohan)
      // Total: 1,199 INR
      const wifiRes = await client.query(
        `INSERT INTO expenses (group_id, description, amount_inr, original_amount, original_currency, conversion_rate, split_type, paid_by, expense_date, notes, import_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [groupId, 'Wifi bill Feb', 1199.00, 1199.00, 'INR', 1.0000, 'equal', userMap['Rohan'], '2026-02-05', 'Internet shared equally', 'manual']
      );
      const wifiId = wifiRes.rows[0].id;
      // 1199 / 4 = 299.75 each
      const wifiSplitAmount = 1199.00 / 4;
      for (const p of rentParticipants) {
        await client.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
           VALUES ($1, $2, $3)`,
          [wifiId, userMap[p], wifiSplitAmount]
        );
      }

      // Seed Expense 3: Goa Villa (USD Expense, Paid by Dev, equal split Aisha, Rohan, Priya, Dev)
      // Total: 540 USD = 45,360 INR
      const villaRes = await client.query(
        `INSERT INTO expenses (group_id, description, amount_inr, original_amount, original_currency, conversion_rate, split_type, paid_by, expense_date, notes, import_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [groupId, 'Goa villa booking', 45360.00, 540.00, 'USD', 84.0000, 'equal', userMap['Dev'], '2026-03-09', 'Goa Villa shared among trip members', 'manual']
      );
      const villaId = villaRes.rows[0].id;
      const villaSplitAmount = 45360.00 / 4;
      const villaParticipants = ['Aisha', 'Rohan', 'Priya', 'Dev'];
      for (const p of villaParticipants) {
        await client.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
           VALUES ($1, $2, $3)`,
          [villaId, userMap[p], villaSplitAmount]
        );
      }

      // Seed Payment 1: Rohan paid Aisha back (Feb Settlement)
      // Total: 5,000 INR
      await client.query(
        `INSERT INTO payments (group_id, paid_by, paid_to, amount, payment_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [groupId, userMap['Rohan'], userMap['Aisha'], 5000.00, '2026-02-25', 'UPI Settlement']
      );

      console.log('Seeding transaction successfully committed!');
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Check if run directly from CLI
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].endsWith('seed.js')) {
  seed().then(() => {
    console.log('Seeding finished.');
    pool.end();
  });
}

export { seed };
