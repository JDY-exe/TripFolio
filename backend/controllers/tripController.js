const Trip = require("../models/trip");

const createTrip = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required" });
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

const deleteTrip = async (req, res) => {
  try {
    const deletedTrip = await Trip.findByIdAndDelete(req.params.id);
    if (!deleteTrip) {
      return res.status(400).json({ message: 'Trip not found' });
    }
    return res.status(200).json({ message: 'Trip successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting trip', error: error.message });
  }
};

const getTripFromUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        message: "UserId is required"
      });
    }
    const trips = await Trip.find({ users: userId });
    return res.status(200).json({ trips });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error"
    });
  }
}

const addUserToTrip = async (req, res) => {
  try {
    const { tripId, userId } = req.body;
    if (!tripId || !userId) {
      return res.status(400).json({
        message: "tripId and userId are required"
      });
    }
    const trip = await Trip.findByIdAndUpdate(
      tripId,
      { $addToSet: { users: userId } },
      { new: true }
    );
    if (!trip) {
      return res.status(404).json({
        message: "Trip no found"
      });
    }
    return res.status(200).json({
      message: "User added to trip successfully",
      trip
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
}
module.exports = { createTrip, getTrips, deleteTrip, getTripFromUser, addUserToTrip };