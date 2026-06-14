import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

export async function registerUser(name, email, password) {
  // Validate presence
  if (!name || !email || !password) {
    throw new Error('All fields (name, email, password) are required.');
  }

  // Check if name or email already exists
  const checkRes = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR name = $2',
    [email, name]
  );
  if (checkRes.rows.length > 0) {
    throw new Error('User with this email or name already exists.');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user
  const insertRes = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );
  const user = insertRes.rows[0];

  // Sign JWT
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { token, user };
}

export async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  // Find user by email
  const res = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  if (res.rows.length === 0) {
    throw new Error('Invalid email or password.');
  }

  const user = res.rows[0];

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  // Sign JWT
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Exclude password hash from response
  delete user.password_hash;

  return { token, user };
}

export async function getUserById(userId) {
  const res = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [userId]
  );
  return res.rows[0] || null;
}

export async function getAllUsers() {
  const res = await pool.query(
    'SELECT id, name, email, created_at FROM users ORDER BY name ASC'
  );
  return res.rows;
}

export async function createUser(name, email) {
  if (!name || !email) {
    throw new Error('Name and email are required.');
  }

  const checkRes = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR name = $2',
    [email, name]
  );
  if (checkRes.rows.length > 0) {
    throw new Error('User with this email or name already exists.');
  }

  const passwordHash = await bcrypt.hash('demo123', 10);

  const insertRes = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );
  return insertRes.rows[0];
}
