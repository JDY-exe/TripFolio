const Itinerary = require ('../models/itinerary');
const Trip = require('../models/trip');
const mongoose = require('mongoose');
const { canEditTrip, canReadTrip, getTripRole } = require('../utils/tripAccess');

const denyTripAccess = (res, trip, userId) => {
  const role = getTripRole(trip, userId);
  return res.status(role ? 403 : 404).json({
    message: role ? 'You do not have permission to edit this trip' : 'Trip not found'
  });
};

const createItinerary = async (req, res) => {
  try {
    const { tripId, title, description, startDate, endDate} = req.body;
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (!canEditTrip(trip, req.user.id)) {
      return denyTripAccess(res, trip, req.user.id);
    }

    const newItinerary = new Itinerary({
      tripId,
      title,
      description,
      startDate,
      endDate
    });

    await newItinerary.save();
    res.status(201).json(newItinerary);
  } catch (error) {
    res.status(500).json({ message: 'Error creating itinerary', error: error.message });
  }
};

const getItinerary = async (req, res) => {
  try {
    const tripId = req.query.id;

    if (!tripId) {
      return res.status(400).json({ message: 'Missing ID parameter in query string' });
    }

    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ message: 'Invalid trip ID' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip || !canReadTrip(trip, req.user.id)) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    let itinerary = await Itinerary.findOne({ tripId });

    if (!itinerary) {
      if (!canEditTrip(trip, req.user.id)) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      itinerary = await Itinerary.create({
        tripId: trip._id,
        title: 'Blank Itinerary',
        description: '',
        startDate: trip.startDate,
        endDate: trip.endDate
      });
    }

    res.status(200).json(itinerary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching itinerary', error: error.message });
  }
}

const updateItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const itinerary = await Itinerary.findById(id);

    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    const trip = await Trip.findById(itinerary.tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (!canEditTrip(trip, req.user.id)) {
      return denyTripAccess(res, trip, req.user.id);
    }
    
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      id,
      { title, description },
      { returnDocument: 'after' }
    );

    if (!updatedItinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    res.status(200).json(updatedItinerary);
  } catch (error) {
    res.status(500).json({ message: 'Error updating itinerary', error: error.message });
  }
};

module.exports = { createItinerary, getItinerary, updateItinerary };