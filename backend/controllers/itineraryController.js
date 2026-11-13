const Itinerary = require ('../models/itinerary');
const Trip = require('../models/trip');
const mongoose = require('mongoose');
const { checkedUpdate } = require('../utils/checkedUpdate');
const { ensureItinerary } = require('../utils/ensureItinerary');
const { canEditTrip, canReadTrip, getTripRole } = require('../utils/tripAccess');
const Event = require('../models/event');

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

    const values = Object.fromEntries(
      Object.entries({ title, description, startDate, endDate })
        .filter(([, value]) => value !== undefined)
    );
    const newItinerary = await ensureItinerary(trip, undefined, values);
    res.status(201).json(newItinerary);
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Error creating itinerary', error: error.message });
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

      itinerary = await ensureItinerary(trip);
    }

    res.status(200).json(itinerary);
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Error fetching itinerary', error: error.message });
  }
}

const updateItinerary = async (req, res) => {
  try {
    const { id } = req.params;
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
    
    const updatedItinerary = await checkedUpdate({
      Model: Itinerary, id, request: req.body, fields: ['title', 'description'],
      authorize: async (current) => {
        const parent = await Trip.findById(current.tripId);
        if (!parent || !canEditTrip(parent, req.user.id)) throw Object.assign(new Error('Cannot edit itinerary'), { status: 403 });
      },
    });

    if (!updatedItinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    res.status(200).json(updatedItinerary);
  } catch (error) {
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json(error.payload || { message: 'Error updating itinerary', error: error.message });
  }
};

const getItineraryForExport = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const itinerary = await Itinerary.findOne({ tripId });
    
    let events = [];
    if (itinerary) {
      // CHANGED: itineraryId -> itineraryID to match your schema exactly
      events = await Event.find({ itineraryID: itinerary._id }).sort({ startTime: 1 });
    }

    const itineraryExport = {
      tripName: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      events: events
    };

    res.status(200).json(itineraryExport);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: "Failed to compile itinerary for export" });
  }
};

module.exports = { createItinerary, getItinerary, updateItinerary, getItineraryForExport };