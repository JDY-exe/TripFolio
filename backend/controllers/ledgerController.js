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

    // Calculate net balance for each user
    const netBalancesMap = {};

    expenses.forEach(exp => {
      if (!exp.paidBy || !exp.splitAmong || exp.splitAmong.length === 0) return;

      const payerId = exp.paidBy.toString();
      const splitAmount = exp.amount / exp.splitAmong.length;

      // Payer is owed the full amount of the expense
      netBalancesMap[payerId] = (netBalancesMap[payerId] || 0) + exp.amount;

      // Everyone in the split owes their portion
      exp.splitAmong.forEach(userId => {
        if (!userId) return;
        const borrowerId = userId.toString();
        netBalancesMap[borrowerId] = (netBalancesMap[borrowerId] || 0) - splitAmount;
      });
    });

    // Convert the map to an array of objects
    const netBalances = Object.keys(netBalancesMap).map(userId => ({
      userId,
      net: netBalancesMap[userId]
    }));

    // Separate into Debtors and Creditors and sort them
    const debtors = netBalances.filter(b => b.net < -0.01).sort((a, b) => a.net - b.net);
    const creditors = netBalances.filter(b => b.net > 0.01).sort((a, b) => b.net - a.net);

    const finalBalances = [];
    let i = 0; // Debtor index
    let j = 0; // Creditor index

    // Greedily match debtors to creditors
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // Settlement amount is the min of what the debtor owes and creditor is owed
      const settlementAmount = Math.min(Math.abs(debtor.net), creditor.net);
      const amount = Math.round(settlementAmount * 100) / 100;

      if (amount > 0) {
        finalBalances.push({
          owerId: debtor.userId,
          oweeId: creditor.userId,
          amount: amount
        });
      }

      // Adjust remaining balances
      debtor.net += amount;
      creditor.net -= amount;

      if (Math.abs(debtor.net) < 0.01) i++;
      if (creditor.net < 0.01) j++;
    }

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