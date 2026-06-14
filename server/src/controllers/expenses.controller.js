import * as expenseService from '../services/expense.service.js';
import * as balanceService from '../services/balance.service.js';

export async function getExpenses(req, res, next) {
  try {
    const result = await expenseService.getExpensesForGroup(req.params.groupId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const result = await expenseService.createExpense(req.body);
    res.status(210).json(result); // Using 210 status matching the API Spec
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function getBalances(req, res, next) {
  try {
    const result = await balanceService.getGroupBalances(req.params.groupId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAuditTrail(req, res, next) {
  try {
    const result = await balanceService.getPairwiseAuditTrail(
      req.params.groupId,
      req.user.id,
      req.params.userId
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
