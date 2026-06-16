import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import routers
import authRouter from './src/routes/auth.routes.js';
import groupsRouter from './src/routes/groups.routes.js';
import expensesRouter from './src/routes/expenses.routes.js';
import paymentsRouter from './src/routes/payments.routes.js';
import importRouter from './src/routes/import.routes.js';
import commentsRouter from './src/routes/comments.routes.js';

// Import error middleware
import { errorMiddleware } from './src/middleware/error.middleware.js';
import { runMigrations } from './src/db/migrate.js';
import { seed } from './src/db/seed.js';

dotenv.config();

// Ensure database migrations and seed are run and awaited
let dbSetupPromise = null;
let dbSetupComplete = false;

export async function ensureDbSetup() {
  if (dbSetupComplete) return;
  if (!dbSetupPromise) {
    dbSetupPromise = (async () => {
      try {
        console.log('Starting database setup (migrations & seed)...');
        await runMigrations();
        await seed();
        dbSetupComplete = true;
        console.log('Database setup completed successfully!');
      } catch (err) {
        dbSetupPromise = null; // Reset promise on failure to allow retry on next request
        throw err;
      }
    })();
  }
  return dbSetupPromise;
}

// Trigger startup DB setup asynchronously (non-blocking for startup itself)
ensureDbSetup().catch((err) => {
  console.error('Database setup failed on startup:', err.message);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Block and ensure DB setup is finished before handling any incoming API requests
app.use(async (req, res, next) => {
  try {
    await ensureDbSetup();
    next();
  } catch (err) {
    console.error('Database setup failed on request:', err.message);
    res.status(500).json({ 
      error: 'Database setup in progress or failed. Please refresh the page.',
      details: err.message 
    });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/import', importRouter);
app.use('/api/expenses/:expenseId/comments', commentsRouter);

// Serve Static Assets in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  
  // Wildcard fallback to SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Simple dev test route
  app.get('/', (req, res) => {
    res.json({ message: 'ExpenseSync API is running in development mode.' });
  });
}

// Global Error Handler
app.use(errorMiddleware);

// Start listening
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
