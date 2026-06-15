import * as commentsService from '../services/comments.service.js';

export async function getComments(req, res, next) {
  try {
    const { expenseId } = req.params;
    const comments = await commentsService.getCommentsForExpense(expenseId);
    res.status(200).json({ comments });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function postComment(req, res, next) {
  try {
    const { expenseId } = req.params;
    const userId = req.user.id;
    const { message } = req.body;
    
    const comment = await commentsService.createComment(expenseId, userId, message);
    res.status(201).json({ comment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
