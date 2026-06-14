import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is missing");
  process.exit(1);
}

export const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Test database connection on startup
pool
  .connect()
  .then((client) => {
    console.log("✅ PostgreSQL connected successfully");
    client.release();
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1);
  });

export const query = async (text, params = []) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error("Database Query Error:", err.message);
    throw err;
  }
};

export default pool;