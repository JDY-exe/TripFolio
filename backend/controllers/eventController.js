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
    const { itineraryID, title, placeId, address, startTime, endTime, notes, restaurant, reservationMade} = req.body;
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
      placeId: placeId || undefined,
      address,
      startTime,
      endTime,
      notes: notes || '',
      restaurant: false || restaurant,
      reservationMade: false || reservationMade
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

const getEventPhoto = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const trip = await findEventTrip(event);
    if (!trip || (!trip.isPublic && !canReadTrip(trip, req.user.id))) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (!event.placeId) {
      return res.status(200).json({ photo: null });
    }
    if (!process.env.GOOGLE_API_KEY) {
      return res.status(503).json({ message: 'Place photos are unavailable' });
    }

    const placeUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(event.placeId)}`;
    const detailsResponse = await fetch(placeUrl, {
      headers: {
        'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'photos',
      },
    });
    if (!detailsResponse.ok) {
      throw new Error(`Place details returned ${detailsResponse.status}`);
    }

    const details = await detailsResponse.json();
    const photo = details.photos?.find((candidate) => candidate.name && candidate.googleMapsUri);
    if (!photo) {
      return res.status(200).json({ photo: null });
    }

    const mediaUrl = new URL(`https://places.googleapis.com/v1/${photo.name}/media`);
    mediaUrl.searchParams.set('maxWidthPx', '360');
    mediaUrl.searchParams.set('skipHttpRedirect', 'true');
    mediaUrl.searchParams.set('key', process.env.GOOGLE_API_KEY);
    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok) {
      throw new Error(`Place photo returned ${mediaResponse.status}`);
    }
    const media = await mediaResponse.json();
    if (!media.photoUri) {
      return res.status(200).json({ photo: null });
    }

    res.status(200).json({
      photo: {
        url: media.photoUri,
        sourceUrl: photo.googleMapsUri,
        authorAttributions: photo.authorAttributions || [],
      },
    });
  } catch (error) {
    console.error('Event photo lookup failed:', error);
    res.status(502).json({ message: 'Could not load place photo' });
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

module.exports = { createEvent, getEvents, getEventPhoto, updateEvent, deleteEvent };
