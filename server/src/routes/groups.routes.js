import { Router } from 'express';
import * as groupsController from '../controllers/groups.controller.js';
import * as expensesController from '../controllers/expenses.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, groupsController.getGroups);
router.post('/', authMiddleware, groupsController.create);
router.get('/:id/members', authMiddleware, groupsController.getMembers);
router.post('/:id/members', authMiddleware, groupsController.addOrUpdateMember);
router.delete('/:id/members/:userId', authMiddleware, groupsController.deleteMember);

// Expense & Balance mappings for the group
router.get('/:groupId/expenses', authMiddleware, expensesController.getExpenses);
router.get('/:groupId/balances', authMiddleware, expensesController.getBalances);
router.get('/:groupId/expenses/audit/:userId', authMiddleware, expensesController.getAuditTrail);
router.get('/:groupId/expenses/export', authMiddleware, expensesController.exportCSV);

export default router;

