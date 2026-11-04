const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');

router.patch('/:tripId/budget', ledgerController.updateBudget);
router.post('/expenses', ledgerController.createExpense);
router.delete('/expenses/:expenseId', ledgerController.deleteExpense);
router.get('/:tripId/balances', ledgerController.getBalances);
router.get('/expenses/:tripId', ledgerController.getExpenses);

module.exports = router;