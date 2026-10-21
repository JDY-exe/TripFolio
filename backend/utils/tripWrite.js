const mongoose = require("mongoose");
const Trip = require("../models/trip");
const { canEditTrip, canReadTrip, getTripRole } = require("./tripAccess");
const { mutationError } = require("./documentVersion");

/** Rechecks access and serializes child lifecycles with parent deletion in a transaction.
 * The internal __v lock does not change the user-facing Trip content version.
 */
const withTripWrite = async (tripId, userId, action, ownerOnly = false) =>
  mongoose.connection.transaction(async (session) => {
    const trip = await Trip.findById(tripId).session(session);
    if (!trip || !canReadTrip(trip, userId))
      throw mutationError(404, "Trip not found");
    if (
      !canEditTrip(trip, userId) ||
      (ownerOnly && getTripRole(trip, userId) !== "owner")
    ) {
      throw mutationError(403, "You do not have permission to edit this trip");
    }
    await Trip.updateOne(
      { _id: tripId },
      { $inc: { __v: 1 } },
      { session, timestamps: false },
    );
    return action(session, trip);
  });

module.exports = { withTripWrite };
