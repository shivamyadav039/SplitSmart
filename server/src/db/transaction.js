import { pool } from './pool.js';

/**
 * Execute a series of database queries inside a single PostgreSQL transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK on errors.
 * 
 * @param {Function} callback - Async function that receives the transactional db client.
 * @returns {Promise<any>} - Returns the callback's resolve value.
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
