const Event = require('../models/event');
const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const { EVENT_TYPE } = require('../utils/eventTypes');
const {
  validateActions,
  actionLocation,
} = require('../utils/reservationEvents');

/** Validates a required chronological event slot. */
const validSlot = (start, end) =>
  Boolean(
    start &&
    end &&
    Number.isFinite(new Date(start).getTime()) &&
    Number.isFinite(new Date(end).getTime()) &&
    new Date(end) > new Date(start),
  );
/** Restricts updates to editable fields, excluding identity and booking references. */
const editableChanges = (body) =>
  Object.fromEntries(
    [
      'title',
      'placeId',
      'address',
      'startTime',
      'endTime',
      'notes',
      'eventType',
      'reservationMade',
      'cost',
    ]
      .filter((key) => body[key] !== undefined)
      .map((key) => [key, body[key]]),
  );
const Itinerary = require('../models/itinerary');
const Trip = require('../models/trip');
const {
  canEditTrip,
  canReadTrip,
  getTripRole,
} = require('../utils/tripAccess');
const { tryPlaceCoordinates } = require('../utils/eventCoordinates');
const Expense = require('../models/Expense');

const findEventTrip = async (event) => {
  const itinerary = await Itinerary.findById(event.itineraryID);
  return itinerary ? Trip.findById(itinerary.tripId) : null;
};

const denyTripAccess = (res, trip, userId) => {
  const role = getTripRole(trip, userId);
  return res.status(role ? 403 : 404).json({
    message: role
      ? 'You do not have permission to edit this trip'
      : 'Trip not found',
  });
};

const createEvent = async (req, res) => {
  try {
    const {
      itineraryID,
      title,
      placeId,
      address,
      startTime,
      endTime,
      notes,
      reservationMade,
      cost
    } = req.body;
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

    const eventType =
      req.body.eventType === undefined ? EVENT_TYPE.ACTIVITY : req.body.eventType;
    if (
      !Object.values(EVENT_TYPE).includes(eventType) ||
      !validSlot(startTime, endTime)
    )
      return res
        .status(400)
        .json({
          message: 'Choose a valid event type and a start and later end time',
        });
    let booking = null;
    let location = {};
    if (![EVENT_TYPE.ACTIVITY, EVENT_TYPE.RESTAURANT].includes(eventType)) {
      if (!mongoose.isValidObjectId(req.body.reservation))
        return res
          .status(400)
          .json({ message: 'Choose a reservation for this action' });
      booking = await Reservation.findById(req.body.reservation);
      if (!booking || String(booking.trip) !== String(trip._id))
        return res.status(404).json({ message: 'Reservation not found' });
      validateActions(booking, [{ eventType, startTime, endTime }], trip);
      location = actionLocation(booking, eventType);
    }
    const coordinates = await tryPlaceCoordinates(location.placeId || placeId);
    const newEvent = new Event({
      itineraryID,
      title: title || 'New Event',
      placeId: placeId || undefined,
      address,
      ...coordinates,
      startTime,
      endTime,
      notes: notes || '',
      eventType,
      reservation: booking?._id || null,
      ...(booking ? { title: booking.name, ...location } : {}),
      reservationMade: booking ? true : Boolean(reservationMade),
      cost: cost || 0
    });

    await newEvent.save();

    // Sync with Ledger if cost exists
    if (newEvent.cost > 0) {
      await Expense.create({
        tripId: trip._id,
        eventId: newEvent._id,
        description: newEvent.title,
        amount: newEvent.cost,
        paidBy: req.user.id,
        splitAmong: [req.user.id] 
      });
    }

    if (booking) {
      await mongoose.connection.transaction(async (session) => {
        await Trip.updateOne(
          { _id: trip._id },
          { $inc: { __v: 1 } },
          { session },
        );
        const current = await Reservation.findById(booking._id, null, {
          session,
        });
        if (!current)
          throw Object.assign(new Error('Reservation no longer exists'), {
            status: 404,
          });
        validateActions(current, [{ eventType, startTime, endTime }], trip);
        const currentLocation = actionLocation(current, eventType);
        if (
          currentLocation.address !== newEvent.address ||
          currentLocation.placeId !== newEvent.placeId
        )
          newEvent.set({ lat: null, lng: null });
        newEvent.set({ title: current.name, ...currentLocation });
        await newEvent.save({ session });
      });
    } else await newEvent.save();
    res.status(201).json(newEvent);
  } catch (error) {
    res
      .status(
        error.code === 11000
          ? 409
          : error.status || (error.name === 'ValidationError' ? 400 : 500),
      )
      .json({
        message:
          error.code === 11000
            ? 'This itinerary action already exists'
            : error.message,
      });
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

    const events = await Event.find({ itineraryID: itinerary_id }).sort({
      startTime: 1,
    });
    res.status(200).json(events);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error getting events', error: error.message });
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
    const photo = details.photos?.find(
      (candidate) => candidate.name && candidate.googleMapsUri,
    );
    if (!photo) {
      return res.status(200).json({ photo: null });
    }

    const mediaUrl = new URL(
      `https://places.googleapis.com/v1/${photo.name}/media`,
    );
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

    const changes = editableChanges(req.body);
    if (
      changes.eventType !== undefined &&
      !Object.values(EVENT_TYPE).includes(changes.eventType)
    )
      return res.status(400).json({ message: 'Invalid event type' });
    if (
      !validSlot(
        changes.startTime !== undefined ? changes.startTime : event.startTime,
        changes.endTime !== undefined ? changes.endTime : event.endTime,
      )
    )
      return res
        .status(400)
        .json({ message: 'Enter a start and later end time' });
    if (event.reservation) {
      if (changes.eventType && changes.eventType !== event.eventType)
        return res
          .status(400)
          .json({
            message: 'Change linked action types from the reservation form',
          });
      for (const field of ['title', 'address', 'placeId'])
        delete changes[field];
    } else if (
      changes.eventType &&
      !['activity', 'restaurant'].includes(changes.eventType)
    )
      return res
        .status(400)
        .json({
          message: 'Link a reservation when creating a logistics action',
        });
    // Re-resolve when the selected place or custom address changes.
    delete changes.lat;
    delete changes.lng;
    if (
      (changes.address !== undefined && changes.address !== event.address) ||
      (changes.placeId !== undefined && changes.placeId !== event.placeId)
    ) {
      changes.lat = null;
      changes.lng = null;
      Object.assign(
        changes,
        await tryPlaceCoordinates(
          changes.placeId !== undefined ? changes.placeId : event.placeId,
        ),
      );
    }
    const persist = async (session) => {
      if (session) {
        await Trip.updateOne(
          { _id: trip._id },
          { $inc: { __v: 1 } },
          { session },
        );
        const current = await Event.findById(id, null, { session });
        const booking = await Reservation.findById(event.reservation, null, {
          session,
        });
        if (!current || !booking || String(booking.trip) !== String(trip._id))
          throw Object.assign(
            new Error('Event or reservation no longer exists'),
            { status: 404 },
          );
        validateActions(
          booking,
          [
            {
              eventType: current.eventType,
              startTime: changes.startTime ?? current.startTime,
              endTime: changes.endTime ?? current.endTime,
            },
          ],
          trip,
        );
      }
      return Event.findByIdAndUpdate(
        id,
        { $set: changes },
        {
          returnDocument: 'after',
          runValidators: true,
          ...(session ? { session } : {}),
        },
      );
    };
    const updatedEvent = event.reservation
      ? await mongoose.connection.transaction(persist)
      : await persist();

    if (!updatedEvent) {
      return res.status(400).json({ message: 'Event not found' });
    }

    // Update associated Ledger Expense
    if (updatedEvent.cost > 0) {
      await Expense.findOneAndUpdate(
        { eventId: updatedEvent._id },
        {
          tripId: trip._id,
          description: updatedEvent.title,
          amount: updatedEvent.cost
        },
        { upsert: true, returnDocument: 'after' } // Creates if it doesn't exist yet
      );
    } else {
      // If cost is changed to 0, remove it from the ledger
      await Expense.findOneAndDelete({ eventId: updatedEvent._id });
    }

    res.status(200).json(updatedEvent);
  } catch (error) {
    res
      .status(error.status || (error.name === 'ValidationError' ? 400 : 500))
      .json({ message: error.message });
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
    // Delete associated ledger expense
    await Expense.findOneAndDelete({ eventId: id });

    if (!deletedEvent) {
      return res.status(400).json({ message: 'Event not found' });
    }
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error deleting event', error: error.message });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventPhoto,
  updateEvent,
  deleteEvent,
};
