import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('Running database migrations...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema SQL
    await pool.query(sql);
    console.log('Database tables successfully created!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate().then(() => {
  pool.end();
});
