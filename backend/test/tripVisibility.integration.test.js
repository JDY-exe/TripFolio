const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Trip = require('../models/trip');
const Itinerary = require('../models/itinerary');
const Event = require('../models/event');
const Reservation = require('../models/Reservation');
const tripRoutes = require('../routes/tripRoutes');
const itineraryRoutes = require('../routes/itineraryRoutes');
const eventRoutes = require('../routes/eventRoutes');
const reservationRoutes = require('../routes/reservationRoutes');

test('trip visibility routes protect private data and retain trip planning flows', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'trip-visibility-integration-secret';
  const originalTripMethods = {
    find: Trip.find,
    findById: Trip.findById,
    findByIdAndUpdate: Trip.findByIdAndUpdate,
    updateOne: Trip.updateOne,
    findByIdAndDelete: Trip.findByIdAndDelete,
    save: Trip.prototype.save,
    itineraryFindById: Itinerary.findById,
    itineraryFindOne: Itinerary.findOne,
    itineraryCreate: Itinerary.create,
    itinerarySave: Itinerary.prototype.save,
    eventFind: Event.find,
    eventFindById: Event.findById,
    eventFindByIdAndUpdate: Event.findByIdAndUpdate,
    eventFindByIdAndDelete: Event.findByIdAndDelete,
    eventSave: Event.prototype.save,
    reservationFind: Reservation.find,
    reservationFindById: Reservation.findById,
    reservationCreate: Reservation.create,
    reservationSave: Reservation.prototype.save,
  };
  const trips = new Map();
  const itineraries = new Map();
  const events = new Map();
  const reservations = new Map();

  Trip.find = (filter = {}) => ({
    sort: async () => [...trips.values()]
      .filter((trip) => (filter.$or || []).some((condition) =>
        condition.ownerId
          ? String(trip.ownerId) === String(condition.ownerId)
          : trip.users.some((userId) => String(userId) === String(condition.users)),
      )),
  });
  Trip.findById = async (id) => trips.get(String(id)) || null;
  Trip.findByIdAndUpdate = async (id, update) => {
    const trip = trips.get(String(id));
    if (!trip) return null;
    for (const [field, value] of Object.entries(update.$addToSet || {})) {
      if (!trip[field].some((memberId) => String(memberId) === String(value))) {
        trip[field].push(new mongoose.Types.ObjectId(value));
      }
    }
    for (const [field, value] of Object.entries(update.$pull || {})) {
      trip[field] = trip[field].filter((memberId) => String(memberId) !== String(value));
    }
    return trip;
  };
  Trip.updateOne = async ({ _id }, update) => {
    const trip = trips.get(String(_id));
    if (!trip) return { matchedCount: 0 };
    for (const [field, value] of Object.entries(update.$addToSet || {})) {
      if (!trip[field].some((entry) => String(entry) === String(value))) {
        trip[field].push(value);
      }
    }
    for (const [field, value] of Object.entries(update.$pull || {})) {
      trip[field] = trip[field].filter((entry) => String(entry) !== String(value));
    }
    return { matchedCount: 1 };
  };
  Trip.findByIdAndDelete = async (id) => {
    const trip = trips.get(String(id)) || null;
    trips.delete(String(id));
    return trip;
  };
  Trip.prototype.save = async function saveTrip() {
    trips.set(String(this._id), this);
    return this;
  };

  Itinerary.findById = async (id) => itineraries.get(String(id)) || null;
  Itinerary.findOne = async ({ tripId }) =>
    [...itineraries.values()].find((itinerary) => String(itinerary.tripId) === String(tripId)) || null;
  Itinerary.create = async (data) => {
    const itinerary = new Itinerary(data);
    return itinerary.save();
  };
  Itinerary.prototype.save = async function saveItinerary() {
    itineraries.set(String(this._id), this);
    return this;
  };

  Event.find = ({ itineraryID }) => ({
    sort: async () => [...events.values()]
      .filter((event) => String(event.itineraryID) === String(itineraryID))
      .sort((first, second) => first.startTime - second.startTime),
  });
  Event.findById = async (id) => events.get(String(id)) || null;
  Event.findByIdAndUpdate = async (id, update) => {
    const event = events.get(String(id));
    if (!event) return null;
    Object.assign(event, update.$set || update);
    return event;
  };
  Event.findByIdAndDelete = async (id) => {
    const event = events.get(String(id)) || null;
    events.delete(String(id));
    return event;
  };
  Event.prototype.save = async function saveEvent() {
    events.set(String(this._id), this);
    return this;
  };
  Reservation.find = (filter = {}) => ({
    sort: async () => [...reservations.values()].filter(
      (reservation) =>
        String(reservation.trip) === String(filter.trip) &&
        reservation.type === filter.type,
    ),
  });
  Reservation.findById = async (id) => reservations.get(String(id)) || null;
  Reservation.create = async (data) => new Reservation(data).save();
  Reservation.prototype.save = async function saveReservation() {
    reservations.set(String(this._id), this);
    return this;
  };

  const app = express();
  app.use(express.json());
  app.use('/trip', tripRoutes);
  app.use('/itinerary', itineraryRoutes);
  app.use('/event', eventRoutes);
  app.use('/logistics', reservationRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const userIds = {
    owner: new mongoose.Types.ObjectId().toString(),
    editor: new mongoose.Types.ObjectId().toString(),
    viewer: new mongoose.Types.ObjectId().toString(),
    stranger: new mongoose.Types.ObjectId().toString(),
  };
  const tokenFor = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET);
  const send = async (path, { method = 'GET', userId, body, formData } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(formData
        ? { body: formData }
        : body
          ? { body: JSON.stringify(body) }
          : {}),
    });
    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : undefined;
    return { response, data };
  };

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Object.assign(Trip, {
      find: originalTripMethods.find,
      findById: originalTripMethods.findById,
      findByIdAndUpdate: originalTripMethods.findByIdAndUpdate,
      updateOne: originalTripMethods.updateOne,
      findByIdAndDelete: originalTripMethods.findByIdAndDelete,
    });
    Trip.prototype.save = originalTripMethods.save;
    Object.assign(Itinerary, {
      findById: originalTripMethods.itineraryFindById,
      findOne: originalTripMethods.itineraryFindOne,
      create: originalTripMethods.itineraryCreate,
    });
    Itinerary.prototype.save = originalTripMethods.itinerarySave;
    Object.assign(Event, {
      find: originalTripMethods.eventFind,
      findById: originalTripMethods.eventFindById,
      findByIdAndUpdate: originalTripMethods.eventFindByIdAndUpdate,
      findByIdAndDelete: originalTripMethods.eventFindByIdAndDelete,
    });
    Event.prototype.save = originalTripMethods.eventSave;
    Reservation.find = originalTripMethods.reservationFind;
    Reservation.findById = originalTripMethods.reservationFindById;
    Reservation.create = originalTripMethods.reservationCreate;
    Reservation.prototype.save = originalTripMethods.reservationSave;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const createOwnerTrip = await send('/trip', {
    method: 'POST',
    userId: userIds.owner,
    body: {
      name: 'Private by default',
      startDate: '2027-04-01',
      endDate: '2027-04-05',
    },
  });
  assert.equal(createOwnerTrip.response.status, 201);
  assert.equal(createOwnerTrip.data.savedTrip.isPublic, false);
  assert.equal(String(createOwnerTrip.data.savedTrip.ownerId), userIds.owner);
  const tripId = createOwnerTrip.data.savedTrip._id;

  const privateDetailWithoutAuth = await send(`/trip/${tripId}`);
  assert.equal(privateDetailWithoutAuth.response.status, 401);
  const privateDetailAsStranger = await send(`/trip/${tripId}`, {
    userId: userIds.stranger,
  });
  assert.equal(privateDetailAsStranger.response.status, 404);
  const strangerTripList = await send('/trip', { userId: userIds.stranger });
  assert.deepEqual(strangerTripList.data, []);

  const ownerTripList = await send('/trip', { userId: userIds.owner });
  assert.equal(ownerTripList.data.length, 1);
  assert.equal(ownerTripList.data[0]._id, tripId);

  const viewerMembership = await send('/trip/user', {
    method: 'PATCH',
    userId: userIds.owner,
    body: { tripId, userId: userIds.viewer, role: 'viewer' },
  });
  assert.equal(viewerMembership.response.status, 200);
  const editorMembership = await send('/trip/user', {
    method: 'PATCH',
    userId: userIds.owner,
    body: { tripId, userId: userIds.editor, role: 'editor' },
  });
  assert.equal(editorMembership.response.status, 200);
  const pictureForm = new FormData();
  pictureForm.append(
    'image',
    new Blob(['trip image'], { type: 'image/jpeg' }),
    'trip.jpg',
  );
  const editorPictureUpdate = await send(
    `/trip/${tripId}/profile_picture`,
    {
      method: 'PATCH',
      userId: userIds.editor,
      formData: pictureForm,
    },
  );
  assert.equal(editorPictureUpdate.response.status, 403);
  assert.equal(
    editorPictureUpdate.data.message,
    'Only the trip owner can change the trip picture',
  );

  const viewerTripDetail = await send(`/trip/${tripId}`, { userId: userIds.viewer });
  assert.equal(viewerTripDetail.response.status, 200);
  assert.equal(viewerTripDetail.data.currentUserRole, 'viewer');
  const viewerVisibilityUpdate = await send(`/trip/${tripId}/visibility`, {
    method: 'PATCH',
    userId: userIds.viewer,
    body: { isPublic: true },
  });
  assert.equal(viewerVisibilityUpdate.response.status, 403);

  const hotelBody = {
    name: 'Harbor Hotel',
    startTime: '2027-04-01T15:00:00.000Z',
    endTime: '2027-04-05T11:00:00.000Z',
    accommodations: { address: '15 Example Street' },
    tripId,
  };
  const privateHotelCreate = await send('/logistics/hotels', {
    method: 'POST',
    userId: userIds.owner,
    body: hotelBody,
  });
  assert.equal(privateHotelCreate.response.status, 201);
  const viewerHotelUpdate = await send(
    `/logistics/hotels/${privateHotelCreate.data.reservation._id}`,
    {
      method: 'PATCH',
      userId: userIds.viewer,
      body: { name: 'Unauthorized hotel edit' },
    },
  );
  assert.equal(viewerHotelUpdate.response.status, 403);
  const ownerHotelUpdate = await send(
    `/logistics/hotels/${privateHotelCreate.data.reservation._id}`,
    {
      method: 'PATCH',
      userId: userIds.owner,
      body: { name: 'Updated Harbor Hotel' },
    },
  );
  assert.equal(ownerHotelUpdate.response.status, 200);
  assert.equal(ownerHotelUpdate.data.reservation.name, 'Updated Harbor Hotel');
  const privateHotelsAsStranger = await send(`/logistics/hotels?tripId=${tripId}`, {
    userId: userIds.stranger,
  });
  assert.equal(privateHotelsAsStranger.response.status, 404);
  const privateHotelsAsViewer = await send(`/logistics/hotels?tripId=${tripId}`, {
    userId: userIds.viewer,
  });
  assert.equal(privateHotelsAsViewer.response.status, 200);
  assert.equal(privateHotelsAsViewer.data.reservations.length, 1);
  const viewerHotelCreate = await send('/logistics/hotels', {
    method: 'POST',
    userId: userIds.viewer,
    body: hotelBody,
  });
  assert.equal(viewerHotelCreate.response.status, 403);

  const privateItinerary = await send('/itinerary', {
    method: 'POST',
    userId: userIds.owner,
    body: {
      tripId,
      title: 'Private plan',
      description: '',
      startDate: '2027-04-01',
      endDate: '2027-04-05',
    },
  });
  assert.equal(privateItinerary.response.status, 201);
  const privateEvent = await send('/event', {
    method: 'POST',
    userId: userIds.owner,
    body: {
      itineraryID: privateItinerary.data._id,
      title: 'Private dinner',
      startTime: '2027-04-02T18:00:00.000Z',
      endTime: '2027-04-02T19:00:00.000Z',
    },
  });
  assert.equal(privateEvent.response.status, 201);
  const privateItineraryAsStranger = await send(`/itinerary?id=${tripId}`, {
    userId: userIds.stranger,
  });
  assert.equal(privateItineraryAsStranger.response.status, 404);
  const privateEventsAsStranger = await send(
    `/event?itinerary_id=${privateItinerary.data._id}`,
    { userId: userIds.stranger },
  );
  assert.equal(privateEventsAsStranger.response.status, 404);
  const privateEventUpdateAsStranger = await send(`/event/${privateEvent.data._id}`, {
    method: 'PATCH',
    userId: userIds.stranger,
    body: { title: 'Unauthorized edit' },
  });
  assert.equal(privateEventUpdateAsStranger.response.status, 404);

  const ownerVisibilityUpdate = await send(`/trip/${tripId}/visibility`, {
    method: 'PATCH',
    userId: userIds.owner,
    body: { isPublic: true },
  });
  assert.equal(ownerVisibilityUpdate.response.status, 200);
  assert.equal(ownerVisibilityUpdate.data.isPublic, true);
  const publicTripListAsStranger = await send('/trip', {
    userId: userIds.stranger,
  });
  assert.deepEqual(publicTripListAsStranger.data, []);
  const publicHotelsAsStranger = await send(`/logistics/hotels?tripId=${tripId}`, {
    userId: userIds.stranger,
  });
  assert.equal(publicHotelsAsStranger.response.status, 404);
  const publicItineraryAsStranger = await send(`/itinerary?id=${tripId}`, {
    userId: userIds.stranger,
  });
  assert.equal(publicItineraryAsStranger.response.status, 404);
  const publicEventsAsStranger = await send(
    `/event?itinerary_id=${privateItinerary.data._id}`,
    { userId: userIds.stranger },
  );
  assert.equal(publicEventsAsStranger.response.status, 404);
  const publicItineraryUpdateAsStranger = await send(
    `/itinerary/${privateItinerary.data._id}`,
    {
      method: 'PATCH',
      userId: userIds.stranger,
      body: { title: 'Unauthorized public edit' },
    },
  );
  assert.equal(publicItineraryUpdateAsStranger.response.status, 404);
  const publicTripDetail = await send(`/trip/${tripId}`, { userId: userIds.stranger });
  assert.equal(publicTripDetail.response.status, 404);

  const itineraryCreate = await send('/itinerary', {
    method: 'POST',
    userId: userIds.owner,
    body: {
      tripId,
      title: 'Weekend plan',
      description: '',
      startDate: '2027-04-01',
      endDate: '2027-04-05',
    },
  });
  assert.equal(itineraryCreate.response.status, 201);
  const itineraryId = itineraryCreate.data._id;
  const itineraryRead = await send(`/itinerary?id=${tripId}`, { userId: userIds.viewer });
  assert.equal(itineraryRead.response.status, 200);
  const viewerItineraryUpdate = await send(`/itinerary/${itineraryId}`, {
    method: 'PATCH',
    userId: userIds.viewer,
    body: { title: 'Unauthorized edit' },
  });
  assert.equal(viewerItineraryUpdate.response.status, 403);

  const eventCreate = await send('/event', {
    method: 'POST',
    userId: userIds.owner,
    body: {
      itineraryID: itineraryId,
      title: 'Dinner',
      address: '15 Example Street',
      startTime: '2027-04-02T18:00:00.000Z',
      endTime: '2027-04-02T19:00:00.000Z',
      notes: '',
    },
  });
  assert.equal(eventCreate.response.status, 201);
  assert.equal(eventCreate.data.address, '15 Example Street');
  const persistedEvents = await Event.find({ itineraryID: itineraryId }).sort({ startTime: 1 });
  assert.equal(persistedEvents.length, 1);
  const eventRead = await send(`/event?itinerary_id=${itineraryId}`, {
    userId: userIds.viewer,
  });
  assert.equal(eventRead.response.status, 200);
  assert.equal(eventRead.data?.[0]?.title, 'Dinner', JSON.stringify(eventRead.data));
  const viewerEventUpdate = await send(`/event/${eventCreate.data._id}`, {
    method: 'PATCH',
    userId: userIds.viewer,
    body: { title: 'Unauthorized edit' },
  });
  assert.equal(viewerEventUpdate.response.status, 403);

  const ownerEventUpdate = await send(`/event/${eventCreate.data._id}`, {
    method: 'PATCH',
    userId: userIds.owner,
    body: { title: 'Updated dinner' },
  });
  assert.equal(ownerEventUpdate.response.status, 200);
  assert.equal(ownerEventUpdate.data.title, 'Updated dinner');
  const ownerEventDelete = await send(`/event/${eventCreate.data._id}`, {
    method: 'DELETE',
    userId: userIds.owner,
  });
  assert.equal(ownerEventDelete.response.status, 200);
  const emptyEventList = await send(`/event?itinerary_id=${itineraryId}`, {
    userId: userIds.owner,
  });
  assert.deepEqual(emptyEventList.data, []);

  const deletionTrip = await send('/trip', {
    method: 'POST',
    userId: userIds.owner,
    body: {
      name: 'Trip to remove',
      startDate: '2027-05-01',
      endDate: '2027-05-03',
    },
  });
  assert.equal(deletionTrip.response.status, 201);
  const tripDelete = await send(`/trip/${deletionTrip.data.savedTrip._id}`, {
    method: 'DELETE',
    userId: userIds.owner,
  });
  assert.equal(tripDelete.response.status, 200);
  const deletedTripDetail = await send(`/trip/${deletionTrip.data.savedTrip._id}`, {
    userId: userIds.owner,
  });
  assert.equal(deletedTripDetail.response.status, 404);
});