const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Trip = require('../models/trip');
const Itinerary = require('../models/itinerary');
const Event = require('../models/event');
const Reservation = require('../models/Reservation');
const { migrateCollections } = require('../scripts/migrateDocumentVersions');

// Real replica-set writes prove that the version predicate and increment are atomic.
test('document versions protect concurrent trip edits and legacy migration', { timeout: 180000 }, async (t) => {
  const repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  t.after(async () => { await mongoose.disconnect(); await repl.stop(); });
  await mongoose.connect(repl.getUri());
  await Promise.all([Trip.init(), Itinerary.init(), Event.init(), Reservation.init()]);
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'document-version-integration-secret';
  t.after(() => { if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret; });
  const owner = new mongoose.Types.ObjectId();
  const editor = new mongoose.Types.ObjectId();
  const viewer = new mongoose.Types.ObjectId();
  const trip = await Trip.create({ name: 'Concurrent trip', startDate: '2030-04-01', endDate: '2030-04-05', ownerId: owner, users: [owner, editor, viewer], viewerIds: [viewer] });
  const itinerary = await Itinerary.create({ tripId: trip._id, title: 'Original', description: 'Original', startDate: trip.startDate, endDate: trip.endDate });
  const event = await Event.create({ itineraryID: itinerary._id, title: 'Museum', address: 'Original address', startTime: '2030-04-02T09:00Z', endTime: '2030-04-02T10:00Z' });
  const app = express();
  app.use(express.json());
  app.use('/trip', require('../routes/tripRoutes'));
  app.use('/itinerary', require('../routes/itineraryRoutes'));
  app.use('/event', require('../routes/eventRoutes'));
  app.use('/logistics', require('../routes/reservationRoutes'));
  const server = app.listen(0);
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = async (path, method = 'GET', body, user = owner) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
      headers: { Authorization: `Bearer ${jwt.sign({ id: String(user) }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };

  await t.test('first concurrent event save wins; unrelated fields on the same event conflict', async () => {
    const responses = await Promise.all([
      request(`/event/${event._id}`, 'PATCH', { expectedVersion: 0, title: 'New title' }),
      request(`/event/${event._id}`, 'PATCH', { expectedVersion: 0, notes: 'New notes' }, editor),
    ]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    const conflict = responses.find(r => r.status === 409).body;
    assert.equal(conflict.code, 'VERSION_CONFLICT');
    assert.equal(conflict.current.version, 1);
    const saved = await Event.findById(event._id);
    assert.equal(saved.version, 1);
    assert.equal(Boolean(saved.title === 'New title') !== Boolean(saved.notes === 'New notes'), true);
  });

  await t.test('repeated conflicts require a new explicit version; changing back never resets it', async () => {
    assert.equal((await request(`/event/${event._id}`, 'PATCH', { expectedVersion: 1, title: 'Second' })).status, 200);
    assert.equal((await request(`/event/${event._id}`, 'PATCH', { expectedVersion: 1, title: 'Stale resolution' })).status, 409);
    assert.equal((await request(`/event/${event._id}`, 'PATCH', { expectedVersion: 2, title: 'Museum' })).body.version, 3);
    const noChange = await request(`/event/${event._id}`, 'PATCH', { expectedVersion: 3, title: 'Museum' });
    assert.equal(noChange.status, 200);
    assert.equal(noChange.body.version, 3);
    assert.equal((await request(`/event/${event._id}`, 'PATCH', { expectedVersion: 0, title: 'Old baseline' })).status, 409);
  });

  await t.test('missing or malformed versions and unauthorized writes cannot save', async () => {
    for (const body of [{ title: 'Missing' }, { expectedVersion: -1 }, { expectedVersion: '3' }, { expectedVersion: 1.5 }]) {
      assert.equal((await request(`/event/${event._id}`, 'PATCH', body)).status, body.expectedVersion === undefined ? 428 : 400);
    }
    assert.equal((await request(`/event/${event._id}`, 'PATCH', { expectedVersion: 3, title: 'Forbidden' }, viewer)).status, 403);
    const forged = await request(`/event/${event._id}`, 'PATCH', { expectedVersion: 3, version: 900, itineraryID: new mongoose.Types.ObjectId(), title: 'Allowed' });
    assert.equal(forged.status, 200);
    assert.equal(forged.body.version, 4);
    assert.equal(String((await Event.findById(event._id)).itineraryID), String(itinerary._id));
  });

  let hotel;
  let rental;
  await t.test('independent reservation documents merge and retain validation', async () => {
    hotel = (await request('/logistics/hotels', 'POST', { tripId: trip._id, name: 'Hotel', startTime: '2030-04-01', endTime: '2030-04-04', accommodations: { address: 'Hotel address' } })).body.reservation;
    rental = (await request('/logistics/rental_cars', 'POST', { tripId: trip._id, name: 'Rental', startTime: '2030-04-01', endTime: '2030-04-04', rentals: { company: 'Company' } })).body.reservation;
    assert.equal(hotel.version, 0);
    const responses = await Promise.all([
      request(`/logistics/hotels/${hotel._id}`, 'PATCH', { expectedVersion: 0, notes: 'Hotel notes' }),
      request(`/logistics/rental_cars/${rental._id}`, 'PATCH', { expectedVersion: 0, notes: 'Rental notes' }, editor),
    ]);
    assert.deepEqual(responses.map(r => r.status), [200, 200]);
    assert.deepEqual(responses.map(r => r.body.reservation.version), [1, 1]);
    assert.equal((await request(`/logistics/hotels/${hotel._id}`, 'PATCH', { expectedVersion: 1, cost: -1 })).status, 400);
    assert.equal((await Reservation.findById(hotel._id)).version, 1);
  });

  await t.test('two hotel bookings and a flight can be edited independently', async () => {
    const secondHotel = (await request('/logistics/hotels', 'POST', { tripId: trip._id, name: 'Second hotel', startTime: '2030-04-03', endTime: '2030-04-05', accommodations: { address: 'Second address' } })).body.reservation;
    const flight = (await request('/logistics/flights', 'POST', { tripId: trip._id, name: 'Flight', flights: { segments: [{ flightNum: 'AA123', departAirport: 'IND', arriveAirport: 'MIA', departTime: '2030-04-01T09:00', arriveTime: '2030-04-01T12:00' }] } })).body.reservation;
    const responses = await Promise.all([
      request(`/logistics/hotels/${secondHotel._id}`, 'PATCH', { expectedVersion: 0, notes: 'Second stay' }),
      request(`/logistics/flights/${flight._id}`, 'PATCH', { expectedVersion: 0, cost: 200 }, editor),
    ]);
    assert.deepEqual(responses.map(result => result.status), [200, 200]);
    assert.equal((await Reservation.findById(hotel._id)).version, 1);
    assert.equal((await Reservation.findById(secondHotel._id)).version, 1);
    assert.equal((await Reservation.findById(flight._id)).version, 1);
  });

  await t.test('concurrent reservation saves conflict and stale deletion preserves the booking', async () => {
    const responses = await Promise.all([
      request(`/logistics/hotels/${hotel._id}`, 'PATCH', { expectedVersion: 1, notes: 'First' }),
      request(`/logistics/hotels/${hotel._id}`, 'PATCH', { expectedVersion: 1, cost: 100 }, editor),
    ]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    assert.equal((await request(`/logistics/hotels/${hotel._id}`, 'DELETE', { expectedVersion: 1 })).status, 409);
    assert.ok(await Reservation.findById(hotel._id));
    assert.equal((await request(`/logistics/hotels/${hotel._id}`, 'DELETE', { expectedVersion: 2 })).status, 200);
    assert.equal((await request(`/logistics/hotels/${hotel._id}`, 'PATCH', { expectedVersion: 2, notes: 'Deleted' })).status, 404);
  });

  await t.test('itinerary text and trip settings use their document version', async () => {
    const responses = await Promise.all([
      request(`/itinerary/${itinerary._id}`, 'PATCH', { expectedVersion: 0, title: 'Changed' }),
      request(`/itinerary/${itinerary._id}`, 'PATCH', { expectedVersion: 0, description: 'Changed' }, editor),
    ]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    const current = (await request(`/trip/${trip._id}`)).body;
    assert.equal((await request(`/trip/${trip._id}/visibility`, 'PATCH', { expectedVersion: current.version, isPublic: true })).status, 200);
    assert.equal((await request(`/trip/${trip._id}/visibility`, 'PATCH', { expectedVersion: current.version, isPublic: false })).status, 409);
    assert.equal((await request(`/trip/${trip._id}`, 'DELETE', { expectedVersion: current.version })).status, 409);
    assert.ok(await Event.findById(event._id), 'a stale parent deletion must not run cascade hooks');
  });

  await t.test('cover uploads compare versions and clean up failed replacements', async () => {
    const upload = async (version) => {
      const form = new FormData();
      form.append('image', new Blob(['test image'], { type: 'image/png' }), 'cover.png');
      form.append('expectedVersion', String(version));
      const response = await fetch(`http://127.0.0.1:${server.address().port}/trip/${trip._id}/profile_picture`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${jwt.sign({ id: String(owner) }, process.env.JWT_SECRET)}` }, body: form,
      });
      return { status: response.status, body: await response.json() };
    };
    const original = await Trip.findById(trip._id);
    const results = await Promise.all([upload(original.version), upload(original.version)]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const collection = mongoose.connection.db.collection('tripProfilePictures.files');
    assert.equal(await collection.countDocuments(), 1);
    const saved = await Trip.findById(trip._id);
    assert.equal(saved.version, original.version + 1);
    const update = Trip.findOneAndUpdate;
    try {
      Trip.findOneAndUpdate = (...args) => {
        if (args[1].$set?.profilePictureId) throw new Error('Simulated commit failure');
        return update.apply(Trip, args);
      };
      assert.equal((await upload(saved.version)).status, 500);
    } finally { Trip.findOneAndUpdate = update; }
    assert.equal(await collection.countDocuments(), 1);
    assert.equal(String((await Trip.findById(trip._id)).profilePictureId), String(saved.profilePictureId));
    assert.equal((await upload(saved.version)).status, 200);
    assert.equal(await collection.countDocuments(), 1, 'successful replacement removes the previous cover');
  });

  await t.test('edit-versus-delete races produce no orphaned children', async () => {
    const current = await Trip.findById(trip._id);
    const results = await Promise.all([
      request(`/trip/${trip._id}`, 'DELETE', { expectedVersion: current.version }),
      request(`/event/${event._id}`, 'PATCH', { expectedVersion: 4, notes: 'Racing delete' }, editor),
    ]);
    assert.equal(results[0].status, 200);
    assert.ok([200, 404].includes(results[1].status));
    assert.equal(await Event.countDocuments({ itineraryID: itinerary._id }), 0);
    assert.equal(await Reservation.countDocuments({ trip: trip._id }), 0);
  });

  await t.test('migration dry-run, apply and reruns preserve existing data and timestamps', async () => {
    const collections = [Trip.collection, Itinerary.collection, Event.collection, Reservation.collection];
    const timestamp = new Date('2020-01-01');
    for (const collection of collections) {
      await collection.insertMany([{ name: 'Legacy', updatedAt: timestamp, __v: 7 }, { name: 'Current', version: 12, updatedAt: timestamp }]);
    }
    const dry = await migrateCollections(collections);
    assert.ok(dry.every(report => report.eligible === 1));
    assert.ok(await Trip.collection.findOne({ version: { $exists: false } }));
    await migrateCollections(collections, true);
    const rerun = await migrateCollections(collections, true);
    assert.ok(rerun.every(report => report.eligible === 0 && report.updated === 0));
    for (const collection of collections) {
      const legacy = await collection.findOne({ name: 'Legacy' });
      assert.equal(legacy.version, 0);
      assert.equal(legacy.__v, 7);
      assert.deepEqual(legacy.updatedAt, timestamp);
      assert.equal((await collection.findOne({ name: 'Current' })).version, 12);
    }
    await Event.collection.insertOne({ version: null });
    await Trip.collection.insertOne({ name: 'Unmigrated' });
    await assert.rejects(migrateCollections(collections, true), /Invalid existing versions/);
    assert.equal((await Trip.collection.findOne({ name: 'Unmigrated' })).version, undefined);
  });
});
