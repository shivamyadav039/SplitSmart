import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is missing");
  if (!process.env.VERCEL) {
    process.exit(1);
  }
}

const cleanConnectionString = connectionString ? connectionString.split('?')[0] : '';
const useSSL = cleanConnectionString && !cleanConnectionString.includes('localhost') && !cleanConnectionString.includes('127.0.0.1') && !cleanConnectionString.includes('::1');

let poolConfig = {};

if (useSSL) {
  const dbUrl = new URL(connectionString);
  poolConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port || 5432,
    database: dbUrl.pathname.slice(1),
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    ssl: { rejectUnauthorized: false },
  };
} else {
  poolConfig = {
    connectionString: cleanConnectionString,
    ssl: false,
  };
}

export const pool = new Pool(poolConfig);

// Test database connection on startup
if (connectionString) {
  pool
    .connect()
    .then((client) => {
      console.log("✅ PostgreSQL connected successfully");
      client.release();
    })
    .catch((err) => {
      console.error("❌ PostgreSQL connection failed:", err.message);
      if (!process.env.VERCEL) {
        process.exit(1);
      }
    });
}

export const query = async (text, params = []) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error("Database Query Error:", err.message);
    throw err;
  }
};

export default pool;