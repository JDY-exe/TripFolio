const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema({
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
tripSchema.pre('findOneAndDelete', async function(next) {
  const tripId = this.getQuery()._id;

  // All Mongoose models of a Trip that needs cascading deletion goes here
  const Itinerary = mongoose.model('Itinerary');
  const Event = mongoose.model('Event');

  // Gather all itinerary IDs to delete child Events
  const itineraries = await Itinerary.find({ tripId });
  const itineraryIds = itineraries.map(it => it._id);

  // Delete all objects related to the itinerary
  if (itineraryIds.length > 0) {
    await Event.deleteMany({ itineraryID: { $in: itineraryIds } });
  }

  // Delete the itinerary(ies) related to this trip
  await Itinerary.deleteMany({ tripId });

  next();
})

module.exports = mongoose.model("Trip", tripSchema);