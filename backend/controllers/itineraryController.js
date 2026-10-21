const { updateVersioned, sendMutationError } = require('../utils/documentVersion');
const { withTripWrite } = require('../utils/tripWrite');
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

    await withTripWrite(tripId, req.user.id, (session) => newItinerary.save({ session }));
    res.status(201).json(newItinerary);
  } catch (error) {
    sendMutationError(res, error);
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

      itinerary = await withTripWrite(trip._id, req.user.id, async (session) => {
        const existing = await Itinerary.findOne({ tripId }, null, { session });
        if (existing) return existing;
        const [created] = await Itinerary.create([{
        tripId: trip._id,
        title: 'Blank Itinerary',
        description: '',
        startDate: trip.startDate,
        endDate: trip.endDate
      }], { session });
        return created;
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
    
    const changes = Object.fromEntries(Object.entries({ title, description }).filter(([, value]) => value !== undefined));
    const updatedItinerary = await withTripWrite(itinerary.tripId, req.user.id, async (session) => {
      const current = await Itinerary.findById(id, null, { session });
      if (!current) throw Object.assign(new Error('Itinerary not found'), { status: 404 });
      return updateVersioned(current, req.body.expectedVersion, changes, session);
    });
    res.status(200).json(updatedItinerary);
  } catch (error) {
    sendMutationError(res, error);
  }
};

module.exports = { createItinerary, getItinerary, updateItinerary };