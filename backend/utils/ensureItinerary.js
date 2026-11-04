const mongoose = require("mongoose");
const Trip = require("../models/trip");
const Itinerary = require("../models/itinerary");

/**
 * Reuses or initializes a trip's itinerary, serializing initialization on the trip.
 * All initialization entry points take the same write lock so transaction retries
 * cannot create duplicate itineraries. No unique-index migration is required.
 * @param {Object} trip - Authorized trip supplying the default dates.
 * @param {Object} [session] - Existing transaction, when part of a reservation write.
 * @param {Object} [values] - Initial itinerary fields supplied by an explicit create.
 * @returns {Promise<Object>} The existing or newly saved itinerary.
 */
const ensureItinerary = async (trip, session, values = {}) => {
  if (!session) {
    return mongoose.connection.transaction(
      (transaction) => ensureItinerary(trip, transaction, values),
      { readPreference: "primary" },
    );
  }
  const result = await Trip.updateOne(
    { _id: trip._id },
    { $inc: { __v: 1 } },
    { session },
  );
  if (result?.matchedCount === 0) {
    const error = new Error("Trip not found");
    error.status = 404;
    throw error;
  }
  const existing = await Itinerary.findOne({ tripId: trip._id }, null, { session });
  if (existing) return existing;
  const [itinerary] = await Itinerary.create([{
    title: "Blank Itinerary",
    description: "",
    startDate: trip.startDate,
    endDate: trip.endDate,
    ...values,
    tripId: trip._id,
  }], { session });
  return itinerary;
};

module.exports = { ensureItinerary };
