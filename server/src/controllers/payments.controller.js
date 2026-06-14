import * as paymentService from '../services/payment.service.js';

export async function create(req, res, next) {
  try {
    const payment = await paymentService.createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function getHistory(req, res, next) {
  try {
    const history = await paymentService.getPaymentsForGroup(req.params.groupId);
    res.status(200).json({ history });
  } catch (error) {
    next(error);
  }
}
