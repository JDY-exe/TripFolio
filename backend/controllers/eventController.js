const Event = require("../models/event");
const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const Expense = require("../models/Expense");
const { EVENT_TYPE } = require("../utils/eventTypes");
const {
  validateActions,
  actionLocation,
} = require("../utils/reservationEvents");
const {
  canEditTrip,
  canReadTrip,
  getTripRole,
} = require("../utils/tripAccess");
const { tryPlaceCoordinates } = require("../utils/eventCoordinates");
const { checkedUpdate, checkedDelete } = require("../utils/checkedUpdate");
const editableFields = [
  "title",
  "placeId",
  "address",
  "startTime",
  "endTime",
  "notes",
  "eventType",
  "reservationMade",
  "cost",
];
const invalid = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const sendError = (res, error) =>
  res
    .status(
      error.code === 11000
        ? 409
        : error.status ||
            (["ValidationError", "CastError"].includes(error.name) ? 400 : 500),
    )
    .json(
      error.payload || {
        message:
          error.code === 11000
            ? "This itinerary action already exists"
            : error.message,
      },
    );
const validSlot = (start, end) =>
  Boolean(
    start &&
    end &&
    Number.isFinite(new Date(start).getTime()) &&
    Number.isFinite(new Date(end).getTime()) &&
    new Date(end) > new Date(start),
  );
const findEventTrip = async (event) => {
  const itinerary = await Itinerary.findById(event.itineraryID);
  return itinerary ? Trip.findById(itinerary.tripId) : null;
};
const authorize = (trip, userId) => {
  if (!trip || !canReadTrip(trip, userId)) throw invalid("Trip not found", 404);
  if (!canEditTrip(trip, userId))
    throw invalid(
      "You do not have permission to edit this trip",
      getTripRole(trip, userId) ? 403 : 404,
    );
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
      cost,
    } = req.body;
    const itinerary = await Itinerary.findById(itineraryID);
    if (!itinerary) throw invalid("Itinerary not found", 404);
    const trip = await Trip.findById(itinerary.tripId);
    authorize(trip, req.user.id);
    const eventType = req.body.eventType ?? EVENT_TYPE.ACTIVITY;
    if (
      !Object.values(EVENT_TYPE).includes(eventType) ||
      !validSlot(startTime, endTime)
    )
      throw invalid("Choose a valid event type and a start and later end time");
    let booking = null;
    let location = {};
    if (![EVENT_TYPE.ACTIVITY, EVENT_TYPE.RESTAURANT].includes(eventType)) {
      if (!mongoose.isValidObjectId(req.body.reservation))
        throw invalid("Choose a reservation for this action");
      booking = await Reservation.findById(req.body.reservation);
      if (!booking || String(booking.trip) !== String(trip._id))
        throw invalid("Reservation not found", 404);
      validateActions(booking, [{ eventType, startTime, endTime }], trip);
      location = actionLocation(booking, eventType);
    }
    const coordinates = await tryPlaceCoordinates(location.placeId || placeId);
    const newEvent = new Event({
      itineraryID,
      title: title || "New Event",
      placeId: placeId || undefined,
      address,
      ...coordinates,
      startTime,
      endTime,
      notes: notes || "",
      eventType,
      reservation: booking?._id || null,
      ...(booking ? { title: booking.name, ...location } : {}),
      reservationMade: booking ? true : Boolean(reservationMade),
      cost: cost || 0,
    });
    if (booking) {
      await mongoose.connection.transaction(async (session) => {
        await Reservation.updateOne(
          { _id: booking._id },
          { $inc: { version: 1 } },
          { session },
        );
        const current = await Reservation.findById(booking._id, null, {
          session,
        });
        if (!current) throw invalid("Reservation no longer exists", 404);
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
    if (newEvent.cost > 0) {
      await Expense.create({
        tripId: trip._id,
        eventId: newEvent._id,
        description: newEvent.title,
        amount: newEvent.cost,
        paidBy: req.user.id,
        splitAmong: [req.user.id],
      });
    }
    res.status(201).json(newEvent);
  } catch (error) {
    sendError(res, error);
  }
};
const getEvents = async (req, res) => {
  try {
    const { itinerary_id } = req.query;
    if (!itinerary_id) throw invalid("Missing itineraryID parameter");
    const itinerary = await Itinerary.findById(itinerary_id);
    if (!itinerary) throw invalid("Itinerary not found", 404);
    const trip = await Trip.findById(itinerary.tripId);
    if (!trip || !canReadTrip(trip, req.user.id))
      throw invalid("Trip not found", 404);
    res.json(
      await Event.find({ itineraryID: itinerary_id }).sort({ startTime: 1 }),
    );
  } catch (error) {
    sendError(res, error);
  }
};
const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw invalid("Event not found", 404);
    const trip = await findEventTrip(event);
    if (!trip || !canReadTrip(trip, req.user.id))
      throw invalid("Event not found", 404);
    res.json(event);
  } catch (error) {
    sendError(res, error);
  }
};
const getEventPhoto = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const trip = await findEventTrip(event);
    if (!trip || (!trip.isPublic && !canReadTrip(trip, req.user.id)))
      return res.status(404).json({ message: "Event not found" });
    if (!event.placeId) return res.json({ photo: null });
    if (!process.env.GOOGLE_API_KEY)
      return res.status(503).json({ message: "Place photos are unavailable" });
    const detailsResponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(event.placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
          "X-Goog-FieldMask": "photos",
        },
      },
    );
    if (!detailsResponse.ok)
      throw new Error(`Place details returned ${detailsResponse.status}`);
    const details = await detailsResponse.json();
    const photo = details.photos?.find(
      (candidate) => candidate.name && candidate.googleMapsUri,
    );
    if (!photo) return res.json({ photo: null });
    const mediaUrl = new URL(
      `https://places.googleapis.com/v1/${photo.name}/media`,
    );
    mediaUrl.searchParams.set("maxWidthPx", "360");
    mediaUrl.searchParams.set("skipHttpRedirect", "true");
    mediaUrl.searchParams.set("key", process.env.GOOGLE_API_KEY);
    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok)
      throw new Error(`Place photo returned ${mediaResponse.status}`);
    const media = await mediaResponse.json();
    if (!media.photoUri) return res.json({ photo: null });
    res.json({
      photo: {
        url: media.photoUri,
        sourceUrl: photo.googleMapsUri,
        authorAttributions: photo.authorAttributions || [],
      },
    });
  } catch (error) {
    console.error("Event photo lookup failed:", error);
    res.status(502).json({ message: "Could not load place photo" });
  }
};
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) throw invalid("Event not found", 404);
    const persist = async (session) =>
      checkedUpdate({
        Model: Event,
        id,
        request: req.body,
        session,
        fields: editableFields,
        groups: [["address", "placeId"]],
        authorize: async (current) =>
          authorize(await findEventTrip(current), req.user.id),
        prepare: async (merged, current, changes) => {
          if (!validSlot(merged.startTime, merged.endTime))
            throw invalid("Enter a start and later end time");
          if (current.reservation) {
            if (
              ["title", "address", "placeId", "eventType"].some(
                (key) =>
                  Object.hasOwn(changes, key) &&
                  String(merged.get(key)) !== String(current.get(key)),
              )
            )
              throw invalid("Edit linked identity from the reservation form");
            const booking = await Reservation.findById(
              current.reservation,
              null,
              { session },
            );
            const trip = await findEventTrip(current);
            if (!booking || !trip || String(booking.trip) !== String(trip._id))
              throw invalid("Reservation not found", 404);
            await Reservation.updateOne(
              { _id: booking._id },
              { $inc: { version: 1 } },
              { session },
            );
            validateActions(
              booking,
              [
                {
                  eventType: merged.eventType,
                  startTime: merged.startTime,
                  endTime: merged.endTime,
                },
              ],
              trip,
            );
          } else if (!["activity", "restaurant"].includes(merged.eventType))
            throw invalid(
              "Link a reservation when creating a logistics action",
            );
          if (
            merged.address !== current.address ||
            merged.placeId !== current.placeId
          )
            merged.set({
              lat: null,
              lng: null,
              ...(await tryPlaceCoordinates(merged.placeId)),
            });
        },
      });
    const updatedEvent = event.reservation
      ? await mongoose.connection.transaction(persist)
      : await persist();
    if (updatedEvent.cost > 0) {
      const trip = await findEventTrip(updatedEvent);
      await Expense.findOneAndUpdate(
        { eventId: updatedEvent._id },
        {
          tripId: trip._id,
          description: updatedEvent.title,
          amount: updatedEvent.cost,
        },
        { upsert: true, returnDocument: "after" },
      );
    } else if (event.cost > 0) {
      await Expense.findOneAndDelete({ eventId: updatedEvent._id });
    }
    res.json(updatedEvent);
  } catch (error) {
    sendError(res, error);
  }
};
const deleteEvent = async (req, res) => {
  try {
    const persist = async (session) => {
      const event = await Event.findById(req.params.id, null, { session });
      if (!event) throw invalid("Event not found", 404);
      const trip = await findEventTrip(event);
      authorize(trip, req.user.id);
      if (event.reservation) {
        const booking = await Reservation.findById(event.reservation, null, {
          session,
        });
        if (!booking || String(booking.trip) !== String(trip._id))
          throw invalid("Reservation not found", 404);
        await Reservation.updateOne(
          { _id: event.reservation },
          { $inc: { version: 1 } },
          { session },
        );
      }
      await checkedDelete(Event, event, req.body?.expectedVersion, session);
      if (event.cost > 0) {
        await Expense.findOneAndDelete({ eventId: event._id }, { session });
      }
    };
    await mongoose.connection.transaction(persist);
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    sendError(res, error);
  }
};
module.exports = {
  createEvent,
  getEvents,
  getEvent,
  getEventPhoto,
  updateEvent,
  deleteEvent,
};
