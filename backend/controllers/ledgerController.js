const Trip = require('../models/trip');
const Expense = require('../models/Expense');
const Event = require('../models/event');

// Update Budget
exports.updateBudget = async (req, res) => {
  try {
    const { budget } = req.body;
    if (budget < 0) return res.status(400).json({ error: "Budget cannot be negative" });

    const trip = await Trip.findByIdAndUpdate(req.params.tripId, { budget }, { returnDocument: 'after' });
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ error: "Failed to update budget" });
  }
};

// Handles split math and Event cost syncing
exports.createExpense = async (req, res) => {
  try {
    const { tripId, eventId, description, amount, paidBy, splitAmong } = req.body;
    
    // Default split to payer if array is empty
    const finalSplit = (splitAmong && splitAmong.length > 0) ? splitAmong : [paidBy];

    const newExpense = new Expense({ tripId, eventId, description, amount, paidBy, splitAmong: finalSplit });
    await newExpense.save();

    // Sync cost to Itinerary Event if linked
    if (eventId) {
      // Safely aggregate total cost of all expenses tied to this event
      const expenses = await Expense.find({ eventId });
      const totalEventCost = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      await Event.findByIdAndUpdate(eventId, { cost: totalEventCost });
    }

    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: "Failed to create expense" });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    // Find and delete in a single operation
    const expense = await Expense.findByIdAndDelete(req.params.expenseId);
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    // Reduce the event cost in a single operation using $inc (decrement)
    if (expense.eventId) {
      await Event.findByIdAndUpdate(expense.eventId, { 
        $inc: { cost: -Math.abs(expense.amount) } 
      });
    }

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
};

// Calculate Balances (Core Logic)
exports.getBalances = async (req, res) => {
  try {
    const expenses = await Expense.find({ tripId: req.params.tripId });
    
    // Graph to track who owes whom: balances[owerId][oweeId] = amount
    const debts = {};

    expenses.forEach(exp => {
      // Safeguard against bad/legacy data to prevent division by zero crashes
      if (!exp.paidBy || !exp.splitAmong || exp.splitAmong.length === 0) return;

      // Safely extract the ID whether it's an ObjectId or a string
      const payerId = exp.paidBy.toString();
      
      // Round to nearest cent to prevent floating point errors
      const splitAmount = Math.round((exp.amount / exp.splitAmong.length) * 100) / 100;

      exp.splitAmong.forEach(userId => {
        const borrowerId = userId.toString();
        
        if (borrowerId !== payerId) {
          if (!debts[borrowerId]) debts[borrowerId] = {};
          debts[borrowerId][payerId] = (debts[borrowerId][payerId] || 0) + splitAmount;
        }
      });
    });

    // Coalesce mutual debts (If A owes B $50 and B owes A $30 -> A owes B $20)
    const finalBalances = [];
    Object.keys(debts).forEach(ower => {
      Object.keys(debts[ower]).forEach(owee => {
        let amountOwed = debts[ower][owee];
        let amountOwedBack = (debts[owee] && debts[owee][ower]) ? debts[owee][ower] : 0;

        if (amountOwed > amountOwedBack) {
          finalBalances.push({
            owerId: ower,
            oweeId: owee,
            amount: Math.round((amountOwed - amountOwedBack) * 100) / 100
          });
        }
      });
    });

    res.status(200).json(finalBalances);
  } catch (error) {
    console.error("Balances Calculation Error:", error);
    res.status(500).json({ error: "Failed to calculate balances" });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ tripId: req.params.tripId });
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { description, amount, paidBy, splitAmong } = req.body;
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    // Calculate the difference to keep the Itinerary Event synced
    const amountDifference = (amount !== undefined ? amount : expense.amount) - expense.amount;

    // Update expense fields
    expense.description = description || expense.description;
    expense.amount = amount !== undefined ? amount : expense.amount;
    expense.paidBy = paidBy || expense.paidBy;
    expense.splitAmong = (splitAmong && splitAmong.length > 0) ? splitAmong : [expense.paidBy];
    
    await expense.save();

    // Sync cost changes back to the Itinerary Event
    if (expense.eventId && amountDifference !== 0) {
      await Event.findByIdAndUpdate(expense.eventId, { 
        $inc: { cost: amountDifference } 
      });
    }

    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to update expense" });
  }
};