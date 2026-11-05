const Event = require("../models/event");
const { RESERVATION_EVENT_TYPES } = require("./eventTypes");

/** Creates a client-visible validation error, aborting the surrounding transaction. */
const invalid = (message) => Object.assign(new Error(message), { status: 400 });
/** Returns the location owned by a reservation for one itinerary action. */
const actionLocation = (reservation, eventType) => {
  if (reservation.type === "accommodations")
    return {
      address: reservation.accommodations.address,
      placeId: reservation.accommodations.placeId || null,
    };
  if (reservation.type === "rentals") {
    const prefix = eventType === "rentalcar_return" ? "return" : "pickup";
    if (reservation.rentals[`${prefix}Address`] === undefined) return {};
    return {
      address: reservation.rentals[`${prefix}Address`] || "",
      placeId: reservation.rentals[`${prefix}PlaceId`] || null,
    };
  }
  return {};
};
/** Validates explicit action slots against the reservation dates and trip calendar. */
const validateActions = (reservation, actions, trip) => {
  if (!Array.isArray(actions))
    throw invalid("Itinerary actions must be an array");
  const allowed = RESERVATION_EVENT_TYPES[reservation.type];
  const seen = new Set();
  for (const action of actions) {
    if (
      !action ||
      typeof action !== "object" ||
      !allowed.includes(action.eventType) ||
      seen.has(action.eventType)
    )
      throw invalid("Choose each compatible itinerary action only once");
    seen.add(action.eventType);
    const start = new Date(action.startTime);
    const end = new Date(action.endTime);
    if (
      (typeof action.startTime !== "string" &&
        !(action.startTime instanceof Date)) ||
      (typeof action.endTime !== "string" &&
        !(action.endTime instanceof Date)) ||
      !action.startTime ||
      !action.endTime ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    )
      throw invalid(
        "Enter a start and later end time for each itinerary action",
      );
    const boundary =
      action.eventType.endsWith("checkout") ||
      action.eventType.endsWith("return")
        ? reservation.endTime
        : reservation.startTime;
    if (
      start.toISOString().slice(0, 10) !==
      new Date(boundary).toISOString().slice(0, 10)
    )
      throw invalid("Action dates must match the booking dates");
    const tripStart = new Date(trip.startDate).toISOString().slice(0, 10);
    const tripEnd = new Date(trip.endDate).toISOString().slice(0, 10);
    if (
      start.toISOString().slice(0, 10) < tripStart ||
      end.toISOString().slice(0, 10) > tripEnd
    )
      throw invalid("Itinerary actions must fall within the trip dates");
    if (
      reservation.type === "rentals" &&
      !actionLocation(reservation, action.eventType).address?.trim()
    )
      throw invalid(
        "Enter pickup and return locations for selected rental actions",
      );
  }
  if (allowed.length === 2) {
    const first = actions.find((action) => action.eventType === allowed[0]);
    const last = actions.find((action) => action.eventType === allowed[1]);
    if (first && last && new Date(last.startTime) < new Date(first.endTime))
      throw invalid(
        "Check-out or return must be after the check-in or pickup action",
      );
  }
};
/** Applies an explicit action selection, or refreshes metadata without overwriting personal slots/notes.
 * The caller owns the reservation-scoped MongoDB transaction.
 */
const syncReservationEvents = async ({
  reservation,
  itinerary,
  trip,
  actions,
  session,
  datesChanged = false,
}) => {
  const existing = await Event.find(
    { reservation: reservation._id, itineraryID: itinerary._id },
    null,
    { session },
  ).sort({ startTime: 1 });
  if (actions !== undefined) validateActions(reservation, actions, trip);
  if (
    actions === undefined &&
    datesChanged &&
    reservation.type !== "flights" &&
    existing.length > 0
  )
    throw invalid("Review itinerary action times when changing booking dates");
  if (actions === undefined && datesChanged && reservation.type === 'flights')
    validateActions(reservation, existing, trip);
  const selected = actions === undefined ? existing : actions;
  const kept = new Set();
  const result = [];
  for (const action of selected) {
    let event = existing.find((item) => item.eventType === action.eventType);
    const location = actionLocation(reservation, action.eventType);
    const metadata = { title: reservation.name, ...location };
    if (
      event &&
      Object.hasOwn(location, "address") &&
      (event.address !== location.address || event.placeId !== location.placeId)
    )
      Object.assign(metadata, { lat: null, lng: null });
    if (actions !== undefined)
      Object.assign(metadata, {
        eventType: action.eventType,
        startTime: action.startTime,
        endTime: action.endTime,
      });
    if (event) {
      event.set(metadata);
      event.increment();
      await event.save({ session });
    } else {
      [event] = await Event.create(
        [
          {
            itineraryID: itinerary._id,
            reservation: reservation._id,
            notes: "",
            reservationMade: true,
            ...metadata,
          },
        ],
        { session },
      );
    }
    kept.add(String(event._id));
    result.push(event);
  }
  if (actions !== undefined) {
    for (const event of existing)
      if (!kept.has(String(event._id)))
        await Event.deleteMany(
          {
            _id: event._id,
            itineraryID: itinerary._id,
            reservation: reservation._id,
          },
          { session },
        );
  }
  return result;
};
module.exports = { validateActions, actionLocation, syncReservationEvents };
