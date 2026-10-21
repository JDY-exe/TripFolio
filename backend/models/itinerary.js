const mongoose = require("mongoose");

const itinerarySchema = new mongoose.Schema({
  version: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  title: {
    type:String,
    default: 'My Trip Itinerary'
  },
  description: {
    type:String,
    default: ''
  },
  startDate: {
    type:Date,
  },
  endDate: {
    type:Date,
  }
}, { timestamps: true });

module.exports = mongoose.model("Itinerary", itinerarySchema);