const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  itineraryID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Itinerary',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  placeId: {
    type: String,
  },
  address: {
    type: String,
  },
  lat: {
    type: Number,
  },
  lng: {
    type: Number,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
  },
  restaurant: {
    type: Boolean
  },
  reservationMade: {
    type: Boolean
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);