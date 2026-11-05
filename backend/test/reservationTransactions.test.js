const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const Itinerary = require("../models/itinerary");
const Reservation = require("../models/Reservation");
const Event = require("../models/event");
const routes = require("../routes/reservationRoutes");
const { ensureItinerary } = require("../utils/ensureItinerary");

const ids = Object.fromEntries(["trip", "owner", "viewer", "foreignItinerary"].map(key =>
  [key, new mongoose.Types.ObjectId().toString()]));
const booking = {
  tripId: ids.trip, name: "Harbor Hotel",
  startTime: "2027-04-01T15:00:00Z", endTime: "2027-04-05T11:00:00Z",
  notes: "Original notes", accommodations: { address: "Old address" },
  itineraryActions: [{ eventType: 'hotel_checkin', startTime: '2027-04-01T15:00:00Z', endTime: '2027-04-01T15:30:00Z' }],
};

// This contract harness stages all writes and rejects any operation missing the
// active session. It models commit/abort, not MongoDB's transaction implementation.
test("reservation writes commit together and keep linked events current", async t => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "reservation-transaction-tests";
  let committed = {
    trip: { _id: ids.trip, ownerId: ids.owner, users: [ids.owner, ids.viewer],
      viewerIds: [ids.viewer], reservations: [], startDate: "2027-04-01", endDate: "2027-04-05" },
    itineraries: {}, reservations: {}, events: {},
  };
  let active;
  let failAt;
  let queue = Promise.resolve();
  const check = options => {
    assert.ok(active, "operation must be in a transaction");
    assert.equal(options?.session, active);
    return active.state;
  };
  const fail = point => { if (failAt === point) throw new Error(`Injected failure: ${point}`); };
  t.mock.method(console, "error", () => {});
  t.mock.method(mongoose.connection, "transaction", callback => {
    const run = queue.then(async () => {
      active = { state: structuredClone(committed) };
      try {
        const result = await callback(active);
        fail("commit");
        committed = active.state;
        return result;
      } finally { active = undefined; }
    });
    queue = run.catch(() => {});
    return run;
  });
  t.mock.method(Trip, "findById", async (id, projection, options) => {
    const state = check(options);
    return String(id) === ids.trip ? structuredClone(state.trip) : null;
  });
  t.mock.method(Trip, "updateOne", async (filter, update, options) => {
    const state = check(options);
    assert.equal(String(filter._id), ids.trip);
    state.trip.version = (state.trip.version || 0) + 1;
    if (update.$addToSet) {
      state.trip.reservations.push(String(update.$addToSet.reservations));
      fail("trip-link");
    }
    if (update.$pull) {
      state.trip.reservations = state.trip.reservations.filter(id => id !== String(update.$pull.reservations));
      fail("trip-unlink");
    }
    return { matchedCount: 1 };
  });
  const matches = (record, filter) => Object.entries(filter).every(([key, value]) => String(record[key]) === String(value));
  for (const [Model, key] of [[Itinerary, "itineraries"], [Reservation, "reservations"], [Event, "events"]]) {
    t.mock.method(Model, "findOne", async (filter, projection, options) => {
      const record = Object.values(check(options)[key]).find(value => matches(value, filter));
      return record ? Model.hydrate(record) : null;
    });
    t.mock.method(Model, "findById", async (id, projection, options) => {
      const record = check(options)[key][String(id)];
      return record ? Model.hydrate(record) : null;
    });
    t.mock.method(Model, "create", async (documents, options) => {
      check(options);
      const saved = [];
      for (const values of documents) saved.push(await new Model(values).save(options));
      fail(`${key}-create`);
      return saved;
    });
    t.mock.method(Model.prototype, "save", async function(options) {
      const state = check(options);
      await this.validate();
      if (state[key][String(this._id)]) this.version++;
      state[key][String(this._id)] = JSON.parse(JSON.stringify(this.toObject()));
      fail(`${key}-save`);
      return this;
    });
  }
  t.mock.method(Event, 'find', (filter, projection, options) => ({ sort: async () => Object.values(check(options).events).filter(record => matches(record, filter)).map(record => Event.hydrate(record)) }));
  t.mock.method(Reservation, 'deleteOne', async (filter, options) => {
    const state = check(options);
    assert.equal(state.reservations[String(filter._id)].version, filter.version);
    delete state.reservations[String(filter._id)];
    fail('reservation-delete');
    return { deletedCount: 1 };
  });
  t.mock.method(Event, "deleteMany", async (filter, options) => {
    const state = check(options);
    assert.ok(filter.itineraryID, "event deletion must be itinerary-scoped");
    for (const [id, event] of Object.entries(state.events)) {
      if (matches(event, filter)) delete state.events[id];
    }
    fail("events-delete");
  });

  const app = express();
  app.use(express.json());
  app.use("/logistics", routes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  const send = async (method, path = "", body = booking, user = ids.owner) => {
    const original = committed.reservations[path.slice(1)];
    if (method === 'PATCH' && original && !body.changes) {
      const changes = {};
      const before = {};
      for (const [key, value] of Object.entries(body)) {
        if (key === 'accommodations') {
          changes['accommodations.address'] = value.address;
          changes['accommodations.placeId'] = value.placeId ?? null;
          before['accommodations.address'] = original.accommodations.address;
          before['accommodations.placeId'] = original.accommodations.placeId ?? null;
        } else {
          changes[key] = value;
          before[key] = key === 'itineraryActions'
            ? Object.values(committed.events).filter((event) => event.reservation === original._id).map(({ _id, version, eventType, startTime, endTime }) => ({ _id, version, eventType, startTime, endTime }))
            : original[key] ?? null;
        }
      }
      body = { expectedVersion: original.version, changes, original: before };
    }
    if (method === 'DELETE') body = { expectedVersion: original?.version };
    const response = await fetch(`http://127.0.0.1:${server.address().port}/logistics/hotels${path}`, {
      method, headers: { "Content-Type": "application/json",
        Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}` },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  await t.test("failed creates leave no itinerary, reservation, event or trip reference", async () => {
    for (const point of ["itineraries-create", "reservations-create", "events-create", "trip-link", "commit"]) {
      const before = structuredClone(committed);
      failAt = point;
      assert.equal((await send("POST")).status, 500, point);
      assert.deepEqual(committed, before, point);
    }
    failAt = undefined;
  });
  await t.test("a viewer cannot initialize an itinerary or write a reservation", async () => {
    const before = structuredClone(committed);
    assert.equal((await send("POST", "", booking, ids.viewer)).status, 403);
    assert.deepEqual(committed, before);
  });
  let reservationId;
  let eventId;
  await t.test("creating before opening itinerary initializes it and returns a linked event", async () => {
    const result = await send("POST");
    assert.equal(result.status, 201);
    reservationId = result.body.reservation._id;
    eventId = result.body.events[0]._id;
    assert.equal(result.body.events[0].reservation, reservationId);
    assert.equal(Object.keys(committed.itineraries).length, 1);
    assert.deepEqual(committed.trip.reservations, [reservationId]);
  });
  await t.test('stale disjoint booking edits merge and conflicting multi-record edits roll back', async () => {
    const original = structuredClone(committed.reservations[reservationId]);
    assert.equal((await send('PATCH', `/${reservationId}`, { expectedVersion: original.version,
      changes: { notes: 'Concurrent booking note' }, original: { notes: original.notes } })).status, 200);
    const merged = await send('PATCH', `/${reservationId}`, { expectedVersion: original.version,
      changes: { name: 'Merged hotel' }, original: { name: original.name } });
    assert.equal(merged.status, 200);
    assert.equal(committed.reservations[reservationId].notes, 'Concurrent booking note');
    assert.ok(committed.events[eventId].version > 0, 'internal synchronization increments event versions');
    const before = structuredClone(committed);
    const conflict = await send('PATCH', `/${reservationId}`, { expectedVersion: original.version,
      changes: { notes: 'Stale note', name: 'Must not partially save' }, original: { notes: original.notes, name: original.name } });
    assert.equal(conflict.status, 409); assert.equal(conflict.body.code, 'EDIT_CONFLICT');
    assert.deepEqual(committed, before);
  });
  await t.test('an overlapping linked action conflict leaves the booking and all events unchanged', async () => {
    const bookingSnapshot = structuredClone(committed.reservations[reservationId]);
    const slotSnapshot = Object.values(committed.events).filter((event) => event.reservation === reservationId)
      .map(({ eventType, startTime, endTime }) => ({ eventType, startTime, endTime }));
    committed.events[eventId].startTime = '2027-04-01T16:00:00.000Z';
    committed.events[eventId].endTime = '2027-04-01T16:30:00.000Z';
    committed.events[eventId].version++;
    committed.reservations[reservationId].version++;
    const before = structuredClone(committed);
    const result = await send('PATCH', `/${reservationId}`, {
      expectedVersion: bookingSnapshot.version,
      changes: { name: 'Must not save', itineraryActions: slotSnapshot.map((slot) => ({ ...slot, startTime: '2027-04-01T17:00:00Z', endTime: '2027-04-01T17:30:00Z' })) },
      original: { name: bookingSnapshot.name, itineraryActions: slotSnapshot },
    });
    assert.equal(result.status, 409);
    assert.equal(result.body.conflicts[0].rootField, 'itineraryActions');
    assert.deepEqual(committed, before);
    // Restore the personal slots for the remaining synchronization regressions.
    committed.events[eventId].startTime = slotSnapshot[0].startTime;
    committed.events[eventId].endTime = slotSnapshot[0].endTime;
  });
  await t.test("initialization entry points reuse a single itinerary", async () => {
    const trip = committed.trip;
    const results = await Promise.all([ensureItinerary(trip), ensureItinerary(trip)]);
    assert.equal(String(results[0]._id), String(results[1]._id));
    assert.equal(Object.keys(committed.itineraries).length, 1);
  });
  await t.test("updates synchronize booking fields, preserve event-only fields and clear stale location", async () => {
    Object.assign(committed.events[eventId], { notes: 'Personal itinerary notes', placeId: "old-place", lat: 1, lng: 2 });
    const foreignId = new mongoose.Types.ObjectId().toString();
    committed.events[foreignId] = { ...committed.events[eventId], _id: foreignId, itineraryID: ids.foreignItinerary };
    const beforeForeign = structuredClone(committed.events[foreignId]);
    const result = await send("PATCH", `/${reservationId}`, {
      name: "New hotel",
      notes: "New notes", accommodations: { address: "New address" },
    });
    assert.equal(result.status, 200);
    const event = committed.events[eventId];
    assert.equal(event.title, "New hotel");
    assert.equal(event.startTime, "2027-04-01T15:00:00.000Z");
    assert.equal(event.endTime, "2027-04-01T15:30:00.000Z");
    assert.equal(event.notes, "Personal itinerary notes");
    assert.equal(event.address, "New address");
    assert.equal(event.eventType, 'hotel_checkin');
    assert.equal(event.lat, null);
    assert.equal(event.lng, null);
    assert.equal(event.placeId, null);
    assert.deepEqual(committed.events[foreignId], beforeForeign);
  });
  await t.test("failed event synchronization rolls back reservation changes", async () => {
    const before = structuredClone(committed);
    failAt = "events-save";
    assert.equal((await send("PATCH", `/${reservationId}`, { name: "Must roll back" })).status, 500);
    assert.deepEqual(committed, before);
    failAt = undefined;
  });
  await t.test("delete failures restore the event, reservation and trip reference", async () => {
    for (const point of ["events-delete", "reservation-delete", "trip-unlink", "commit"]) {
      const before = structuredClone(committed);
      failAt = point;
      assert.equal((await send("DELETE", `/${reservationId}`)).status, 500, point);
      assert.deepEqual(committed, before, point);
    }
    failAt = undefined;
  });
  await t.test("successful delete removes only the reservation's own itinerary event", async () => {
    assert.equal((await send("DELETE", `/${reservationId}`)).status, 200);
    assert.equal(committed.reservations[reservationId], undefined);
    assert.equal(committed.events[eventId], undefined);
    assert.deepEqual(committed.trip.reservations, []);
    assert.equal(Object.keys(committed.events).length, 1);
  });
  const actionSlots = [
    { eventType: 'hotel_checkin', startTime: '2027-04-01T15:00:00Z', endTime: '2027-04-01T15:30:00Z' },
    { eventType: 'hotel_checkout', startTime: '2027-04-05T11:00:00Z', endTime: '2027-04-05T11:30:00Z' },
  ];
  await t.test('explicit actions create two short entries and keep personal slots and notes', async () => {
    const created = await send('POST', '', { ...booking, itineraryActions: actionSlots });
    assert.equal(created.status, 201);
    assert.equal(created.body.events.length, 2);
    const id = created.body.reservation._id;
    const first = created.body.events[0]._id;
    committed.events[first].notes = 'Arrive after lunch';
    const edited = await send('PATCH', `/${id}`, { name: 'Renamed hotel', notes: 'Booking-only notes', accommodations: { address: 'New place', placeId: 'google-place' } });
    assert.equal(edited.status, 200);
    assert.equal(committed.events[first].notes, 'Arrive after lunch');
    assert.equal(committed.events[first].startTime, '2027-04-01T15:00:00.000Z');
    assert.equal(committed.events[first].placeId, 'google-place');
    assert.equal(Object.values(committed.events).filter(event => event.reservation === id).length, 2);
    const before = structuredClone(committed);
    assert.equal((await send('PATCH', `/${id}`, { startTime: '2027-04-02T00:00:00Z' })).status, 400);
    assert.deepEqual(committed, before);
    assert.equal((await send('PATCH', `/${id}`, { itineraryActions: [actionSlots[0]] })).status, 200);
    assert.equal(Object.values(committed.events).filter(event => event.reservation === id).length, 1);
    assert.equal((await send('DELETE', `/${id}`)).status, 200);
    assert.equal(Object.values(committed.events).filter(event => event.reservation === id).length, 0);
  });
  await t.test('invalid or duplicate selections abort all writes', async () => {
    for (const itineraryActions of [[actionSlots[0], actionSlots[0]], [{ ...actionSlots[0], startTime: null }], [{ ...actionSlots[0], eventType: 'rentalcar_pickup' }], [{ ...actionSlots[0], startTime: '2027-04-02T15:00:00Z', endTime: '2027-04-02T15:30:00Z' }]]) {
      const before = structuredClone(committed);
      assert.equal((await send('POST', '', { ...booking, itineraryActions })).status, 400);
      assert.deepEqual(committed, before);
    }
  });
  await t.test('explicit empty selection removes actions without recreating them on metadata edits', async () => {
    const created = await send('POST');
    const id = created.body.reservation._id;
    assert.equal((await send('PATCH', `/${id}`, { itineraryActions: [] })).status, 200);
    assert.equal(Object.values(committed.events).filter(event => event.reservation === id).length, 0);
    assert.equal((await send('PATCH', `/${id}`, { name: 'Still no actions' })).status, 200);
    assert.equal(Object.values(committed.events).filter(event => event.reservation === id).length, 0);
    const empty = await send('POST', '', { ...booking, itineraryActions: [] });
    assert.equal(empty.status, 201);
    assert.deepEqual(empty.body.events, []);
    const { itineraryActions, ...bookingOnly } = booking;
    const omitted = await send('POST', '', bookingOnly);
    assert.equal(omitted.status, 201);
    assert.deepEqual(omitted.body.events, []);
  });
  for (const scenario of [
    { name: 'booking and action conflicts are resolved together', aNotes: 'A notes', bStart: '16', bEnd: '18', fields: ['itineraryActions.0.startTime', 'notes'], savedNotes: true, race: true },
    { name: 'a booking conflict preserves safely merged action times on retry', aNotes: 'A notes', bStart: '14', bEnd: '19', fields: ['notes'] },
    { name: 'an action conflict preserves an unrelated booking edit on retry', aNotes: booking.notes, bStart: '16', bEnd: '18', fields: ['itineraryActions.0.startTime'] },
  ]) {
    await t.test(scenario.name, async () => {
      const time = (hour) => `2027-04-01T${hour}:00:00.000Z`;
      const created = await send('POST', '', { ...booking, itineraryActions: [
        { eventType: 'hotel_checkin', startTime: time('14'), endTime: time('18') },
      ] });
      assert.equal(created.status, 201);
      const id = created.body.reservation._id;
      const linkedId = created.body.events[0]._id;
      const slots = created.body.events.map(({ _id, version, eventType, startTime, endTime }) => ({ _id, version, eventType, startTime, endTime }));
      const request = {
        expectedVersion: created.body.reservation.version,
        original: { notes: booking.notes, itineraryActions: slots },
        changes: { notes: 'B notes', itineraryActions: [{ ...slots[0], startTime: time(scenario.bStart), endTime: time(scenario.bEnd) }] },
      };
      assert.equal((await send('PATCH', `/${id}`, {
        ...request,
        changes: { notes: scenario.aNotes, itineraryActions: [{ ...slots[0], startTime: time('15') }] },
      })).status, 200);
      const before = structuredClone(committed);
      const conflict = await send('PATCH', `/${id}`, request);
      assert.equal(conflict.status, 409);
      assert.deepEqual(conflict.body.conflicts.map(({ field }) => field).sort(), scenario.fields);
      assert.deepEqual(committed, before, 'conflicts never partially write');
      // Mirror saveChecked: overlay merged changes, apply explicit choices, then
      // rebase every submitted original onto the response's current snapshot.
      const resolve = (patch, payload) => {
        const changes = { ...patch.changes, ...payload.mergedChanges };
        for (const field of payload.conflicts) {
          const value = field.field === 'notes' && scenario.savedNotes ? field.current : field.submitted;
          if (field.rootField) {
            const [, index, key] = field.field.split('.');
            changes.itineraryActions[index][key] = value;
          } else changes[field.field] = value;
        }
        return {
          expectedVersion: payload.current.version,
          changes,
          original: Object.fromEntries(Object.keys(changes).map((field) => [field, payload.current[field]])),
        };
      };
      let retry = resolve(request, conflict.body);
      if (scenario.race) {
        // A third edit while the dialog is open must still be checked on retry.
        assert.equal((await send('PATCH', `/${id}`, { notes: 'C notes' })).status, 200);
        const beforeRetry = structuredClone(committed);
        const nextConflict = await send('PATCH', `/${id}`, retry);
        assert.equal(nextConflict.status, 409);
        assert.deepEqual(nextConflict.body.conflicts.map(({ field }) => field), ['notes']);
        assert.deepEqual(committed, beforeRetry);
        retry = resolve(retry, nextConflict.body);
      }
      assert.equal((await send('PATCH', `/${id}`, retry)).status, 200);
      assert.equal(committed.reservations[id].notes, scenario.savedNotes ? 'C notes' : 'B notes');
      assert.equal(committed.events[linkedId].startTime, time(scenario.bStart === '14' ? '15' : scenario.bStart));
      assert.equal(committed.events[linkedId].endTime, time(scenario.bEnd));
    });
  }
  await t.test("editing a reservation does not recreate an explicitly deleted event", async () => {
    const created = await send("POST");
    delete committed.events[created.body.events[0]._id];
    const beforeCount = Object.keys(committed.events).length;
    const result = await send("PATCH", `/${created.body.reservation._id}`, { name: "Updated without event" });
    assert.equal(result.status, 200);
    assert.equal(Object.keys(committed.events).length, beforeCount);
  });
});
