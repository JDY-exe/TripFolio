// These existing controller tests mock persistence with plain objects. Keep that
// boundary mocked as the controllers adopt transactions and compare-and-swap.
// Real concurrency, version enforcement, and cascades are covered separately by
// documentVersion.integration.test.js against a MongoDB replica set.
const Trip = require('../../models/trip');
const Event = require('../../models/event');
const Itinerary = require('../../models/itinerary');
const Reservation = require('../../models/Reservation');
const versioning = require('../../utils/documentVersion');
const tripWrites = require('../../utils/tripWrite');

tripWrites.withTripWrite = async (tripId, userId, action) => action(undefined, await Trip.findById(tripId));
versioning.checkVersion = () => {};
versioning.updateVersioned = async (document, expectedVersion, changes) => {
  for (const [field, value] of Object.entries(changes)) {
    if (typeof document.set === 'function') document.set(field, value);
    else document[field] = value;
  }
  if (document.itineraryID) return Event.findByIdAndUpdate(document._id, { $set: changes });
  if (typeof document.save === 'function') return document.save();
  return document;
};
versioning.deleteVersioned = async (document) => {
  if (document.constructor.modelName === 'Trip') return Trip.findByIdAndDelete(document._id);
  if (document.itineraryID) return Event.findByIdAndDelete(document._id);
  if (typeof document.deleteOne === 'function') { await document.deleteOne(); return document; }
  return Trip.findByIdAndDelete(document._id);
};

/** Adapts existing single-record create stubs to Mongoose's transactional array form. */
const adaptCreateStub = (Model) => {
  let implementation = Model.create;
  Object.defineProperty(Model, 'create', {
    configurable: true,
    get: () => {
      const current = implementation;
      return async (values, ...args) => {
        if (Array.isArray(values)) return Promise.all(values.map(value => current(value, ...args)));
        return current(values, ...args);
      };
    },
    set: value => { implementation = value; },
  });
};
adaptCreateStub(Reservation);
adaptCreateStub(Itinerary);
