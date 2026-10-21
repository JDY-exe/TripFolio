const Event = require("../models/event");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const { canReadTrip } = require("../utils/tripAccess");
const { geocodeAddress } = require("../utils/mapGeocoding");
const {
  getEventCoordinates,
  lookupPlaceCoordinates,
} = require("../utils/eventCoordinates");

/** Returns saved coordinates, resolving older selected places by ID when needed.
 * @param {object} req - Authenticated request containing the event ID.
 * @param {object} res - Express response.
 * @returns {Promise<object>} Coordinates or a scoped error response.
 */
const getEventLocation = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const itinerary = event && (await Itinerary.findById(event.itineraryID));
    const trip = itinerary && (await Trip.findById(itinerary.tripId));
    if (!trip || !canReadTrip(trip, req.user.id)) {
      return res.status(404).json({ message: "Event not found" });
    }
    const address = event.address || "";
    const saved = getEventCoordinates(event);
    if (saved) return res.json({ location: saved });
    const location = event.placeId
      ? await lookupPlaceCoordinates(event.placeId)
      : await geocodeAddress(address);
    // Do not attach coordinates to a place changed while lookup was running.
    if (location)
      await Event.updateOne(
        { _id: event._id, address: event.address, placeId: event.placeId },
        { $set: location },
      );
    return res.json({ location });
  } catch {
    return res.status(503).json({ message: "Could not locate this event" });
  }
};

module.exports = { getEventLocation };
