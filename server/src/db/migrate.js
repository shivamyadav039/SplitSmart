import { pool } from './pool.js';
import { schemaSql } from './schema.js';

export async function runMigrations() {
  console.log('Running database migrations...');
  try {
    // Execute schema SQL from inlined JS string
    await pool.query(schemaSql);
    console.log('Database tables successfully created!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Only run immediately if executed directly via CLI
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('migrate.js') || process.argv[1].endsWith('migrate'));
if (isDirectRun) {
  runMigrations().then(() => {
    pool.end();
  }).catch(() => {
    process.exit(1);
  });
}
