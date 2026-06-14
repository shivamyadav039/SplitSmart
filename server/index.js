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

// Import error middleware
import { errorMiddleware } from './src/middleware/error.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/import', importRouter);

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
