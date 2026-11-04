const mongoose = require('mongoose');
const { EVENT_TYPE, RESERVATION_EVENT_TYPES } = require('../utils/eventTypes');

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
  eventType: {
    type: String,
    enum: Object.values(EVENT_TYPE),
    required: true,
    default: EVENT_TYPE.ACTIVITY,
  },
  reservationMade: {
    type: Boolean
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reservation",
    default: null
  }
}, { timestamps: true });

eventSchema.index({ reservation: 1, itineraryID: 1 }, { name: 'reservation_itinerary_events' });
eventSchema.index({ reservation: 1, eventType: 1 }, {
  unique: true, name: 'reservation_event_action',
  partialFilterExpression: { reservation: { $type: 'objectId' }, eventType: { $in: Object.values(RESERVATION_EVENT_TYPES).flat() } },
});
module.exports = mongoose.model('Event', eventSchema);