const mongoose = require("mongoose");
const Reservation = require("./Reservation");
const TripInvitation = require("./TripInvitation");

const tripSchema = new mongoose.Schema({
  version: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  viewerIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  profilePictureId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  name: {
    type: String,
    required: [true, "Trip name is required"]
  },
  startDate: {
    type: Date,
    required: [true, "Start date is required"]
  },
  endDate: {
    type: Date,
    required: [true, "End date is required"]
  },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  reservations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation"
    }
  ]
}, { timestamps: true });

// Script for cascading delete middleware
tripSchema.pre('findOneAndDelete', async function() {
  const filter = this.getQuery();
  const session = this.getOptions().session;
  const existing = await this.model.findOne(filter).session(session || null);
  if (!existing) return;
  const tripId = existing._id;

  // All Mongoose models of a Trip that needs cascading deletion goes here
  const Itinerary = mongoose.models.Itinerary;
  const Event = mongoose.models.Event;

  if (!Itinerary || !Event) {
    console.warn("Mongoose models not found during cascading delete.");
    return;
  }

  // Gather all itinerary IDs to delete child Events
  const itineraries = await Itinerary.find({ tripId }).session(session || null);
  const itineraryIds = itineraries.map(it => it._id);

  // Delete all objects related to the itinerary
  if (itineraryIds.length > 0) {
    await Event.deleteMany({ itineraryID: { $in: itineraryIds } }, { session });
  }

  // Delete the itinerary(ies) related to this trip
  await Itinerary.deleteMany({ tripId }, { session });

  // Delete reservations linked to this trip.
  await Reservation.deleteMany({ trip: tripId }, { session });
  await TripInvitation.deleteMany({ trip: tripId }, { session });
})

module.exports = mongoose.model("Trip", tripSchema);
