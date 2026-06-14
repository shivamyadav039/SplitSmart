import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('FATAL ERROR: DATABASE_URL environment variable is not defined!');
  process.exit(1);
}

export const pool = new Pool({
  connectionString,
  // For production environments like Render, self-signed certificates might be required.
  // We check if it is production to enable SSL rejection bypass if necessary.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper utility for simple queries
export const query = (text, params) => pool.query(text, params);
