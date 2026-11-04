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
    if (update.$inc) state.trip.__v = (state.trip.__v || 0) + 1;
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
      state[key][String(this._id)] = JSON.parse(JSON.stringify(this.toObject()));
      fail(`${key}-save`);
      return this;
    });
  }
  t.mock.method(Reservation.prototype, "deleteOne", async function(options) {
    delete check(options).reservations[String(this._id)];
    fail("reservation-delete");
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
    const response = await fetch(`http://127.0.0.1:${server.address().port}/logistics/hotels${path}`, {
      method, headers: { "Content-Type": "application/json",
        Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}` },
      ...(method !== "DELETE" && { body: JSON.stringify(body) }),
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
    eventId = result.body.event._id;
    assert.equal(result.body.event.reservation, reservationId);
    assert.equal(Object.keys(committed.itineraries).length, 1);
    assert.deepEqual(committed.trip.reservations, [reservationId]);
  });
  await t.test("initialization entry points reuse a single itinerary", async () => {
    const trip = committed.trip;
    const results = await Promise.all([ensureItinerary(trip), ensureItinerary(trip)]);
    assert.equal(String(results[0]._id), String(results[1]._id));
    assert.equal(Object.keys(committed.itineraries).length, 1);
  });
  await t.test("updates synchronize booking fields, preserve event-only fields and clear stale location", async () => {
    Object.assign(committed.events[eventId], { restaurant: true, placeId: "old-place", lat: 1, lng: 2 });
    const foreignId = new mongoose.Types.ObjectId().toString();
    committed.events[foreignId] = { ...committed.events[eventId], _id: foreignId, itineraryID: ids.foreignItinerary };
    const beforeForeign = structuredClone(committed.events[foreignId]);
    const result = await send("PATCH", `/${reservationId}`, {
      name: "New hotel", startTime: "2027-04-02T15:00:00Z", endTime: "2027-04-06T11:00:00Z",
      notes: "New notes", accommodations: { address: "New address" },
    });
    assert.equal(result.status, 200);
    const event = committed.events[eventId];
    assert.equal(event.title, "New hotel");
    assert.equal(event.startTime, "2027-04-02T15:00:00.000Z");
    assert.equal(event.endTime, "2027-04-06T11:00:00.000Z");
    assert.equal(event.notes, "New notes");
    assert.equal(event.address, "New address");
    assert.equal(event.restaurant, true);
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
  await t.test("editing a reservation does not recreate an explicitly deleted event", async () => {
    const created = await send("POST");
    delete committed.events[created.body.event._id];
    const beforeCount = Object.keys(committed.events).length;
    const result = await send("PATCH", `/${created.body.reservation._id}`, { name: "Updated without event" });
    assert.equal(result.status, 200);
    assert.equal(Object.keys(committed.events).length, beforeCount);
  });
});
