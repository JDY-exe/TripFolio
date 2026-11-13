const mongoose = require("mongoose");
const Reservation = require("./Reservation");
const TripInvitation = require("./TripInvitation");

const tripSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  memberRoles: {
    type: Map,
    of: {
      type: String,
      enum: ["owner", "editor", "viewer"]
    },
    default: {}
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
  votes: {
    type: Number,
    required: false,
    default: 0
  },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  archivedSharedWith: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  hiddenUsers: [
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
  ],
  location: {
    type: String,
    required: [true, "Location is required"]
  },
  archived: {
    type: Boolean,
    default: false,
  },
  budget: {
    type: Number,
    default: 0,
    min: [0, 'Budget cannot be negative']
  },
  essentials: [{
    title: { type: String, required: true },
    value: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    mimetype: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Script for cascading delete middleware
tripSchema.post('findOneAndDelete', async function(deleted) {
  if (!deleted) return;
  const tripId = deleted._id;
  const session = this.getOptions().session;

  // Preserve metadata on storage failure so deleting the trip can be retried.
  await require("../services/photoCleanup").deleteTripPhotos(tripId);

  // All Mongoose models of a Trip that needs cascading deletion goes here
  const Itinerary = mongoose.models.Itinerary;
  const Event = mongoose.models.Event;

  if (!Itinerary || !Event) {
    console.warn("Mongoose models not found during cascading delete.");
    return;
  }

  // Gather all itinerary IDs to delete child Events
  const itineraries = await Itinerary.find({ tripId }, null, { session });
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
  await mongoose.models.ArchivedItineraryNote?.deleteMany({ tripId }, { session });
})

tripSchema.plugin(require("../utils/recordVersion"));
module.exports = mongoose.model("Trip", tripSchema);
