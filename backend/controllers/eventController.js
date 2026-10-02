const Event = require('../models/event');
const Itinerary = require('../models/itinerary');
const Trip = require('../models/trip');
const { canEditTrip, canReadTrip, getTripRole } = require('../utils/tripAccess');

const findEventTrip = async (event) => {
  const itinerary = await Itinerary.findById(event.itineraryID);
  return itinerary ? Trip.findById(itinerary.tripId) : null;
};

const denyTripAccess = (res, trip, userId) => {
  const role = getTripRole(trip, userId);
  return res.status(role ? 403 : 404).json({
    message: role ? 'You do not have permission to edit this trip' : 'Trip not found'
  });
};

const createEvent = async (req, res) => {
  try {
    const { itineraryID, title, address, startTime, endTime, notes } = req.body;
    const itinerary = await Itinerary.findById(itineraryID);
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

    const newEvent = new Event ({
      itineraryID,
      title: title || 'New Event',
      address,
      startTime,
      endTime,
      notes: notes || ''
    });

    await newEvent.save()
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
};

const getEvents = async (req, res) => {
  try {
    const { itinerary_id } = req.query;

    if (!itinerary_id) {
      return res.status(400).json({ message: 'Missing itineraryID parameter' });
    }

    const itinerary = await Itinerary.findById(itinerary_id);
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    const trip = await Trip.findById(itinerary.tripId);
    if (!trip || !canReadTrip(trip, req.user.id)) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const events = await Event.find({ itineraryID: itinerary_id }).sort({ startTime: 1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error getting events', error: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const trip = await findEventTrip(event);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (!canEditTrip(trip, req.user.id)) {
      return denyTripAccess(res, trip, req.user.id);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ message: 'Event not found' });
    }
    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Error updating event', error: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const trip = await findEventTrip(event);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (!canEditTrip(trip, req.user.id)) {
      return denyTripAccess(res, trip, req.user.id);
    }

    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
      return res.status(400).json({ message: 'Event not found' });
    }
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event', error: error.message });
  }
};

module.exports = { createEvent, getEvents, updateEvent, deleteEvent };