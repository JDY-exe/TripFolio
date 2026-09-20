const Trip = require("../models/trip");

const createTrip = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required"});
    }

    // Validate dates
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    const newTrip = new Trip({ name, startDate, endDate });
    const savedTrip = await newTrip.save();

    res.status(201).json({ savedTrip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 });
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTrip, getTrips };