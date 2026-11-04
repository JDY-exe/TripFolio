const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Event = require("../models/event");
const Reservation = require("../models/Reservation");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const { createEvent, updateEvent } = require("../controllers/eventController");
const ids = Object.fromEntries(
  ["trip", "otherTrip", "booking", "itinerary", "owner"].map((key) => [
    key,
    String(new mongoose.Types.ObjectId()),
  ]),
);
const slot = {
  startTime: "2027-06-12T15:00:00Z",
  endTime: "2027-06-12T15:30:00Z",
};
const response = () => ({
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("typed event creation checks booking ownership/category and returns duplicate conflicts", async (t) => {
  t.mock.method(Itinerary, "findById", async () => ({ tripId: ids.trip }));
  t.mock.method(Trip, "findById", async () => ({
    _id: ids.trip,
    ownerId: ids.owner,
    startDate: "2027-06-12",
    endDate: "2027-06-15",
  }));
  let booking = {
    _id: ids.booking,
    trip: ids.otherTrip,
    type: "accommodations",
    startTime: slot.startTime,
    endTime: "2027-06-15T10:00:00Z",
    name: "Hotel",
    accommodations: { address: "Hotel address" },
  };
  t.mock.method(Reservation, "findById", async () => booking);
  const req = {
    user: { id: ids.owner },
    body: {
      itineraryID: ids.itinerary,
      eventType: "hotel_checkin",
      reservation: ids.booking,
      ...slot,
    },
  };
  let res = response();
  await createEvent(req, res);
  assert.equal(res.code, 404);
  booking.trip = ids.trip;
  res = response();
  await createEvent(
    { ...req, body: { ...req.body, eventType: "rentalcar_pickup" } },
    res,
  );
  assert.equal(res.code, 400);
  res = response();
  await createEvent({ ...req, body: { ...req.body, reservation: null } }, res);
  assert.equal(res.code, 400);
  t.mock.method(mongoose.connection, "transaction", async (callback) =>
    callback({}),
  );
  t.mock.method(Trip, "updateOne", async () => ({ matchedCount: 1 }));
  t.mock.method(Event.prototype, "save", async function () {
    return this;
  });
  res = response();
  await createEvent(req, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.title, booking.name);
  assert.equal(res.body.address, booking.accommodations.address);
  assert.equal(res.body.eventType, "hotel_checkin");
  t.mock.method(Event.prototype, "save", async () => {
    throw Object.assign(new Error("duplicate"), { code: 11000 });
  });
  res = response();
  await createEvent(req, res);
  assert.equal(res.code, 409);
});

test("event updates allowlist fields, keep linked metadata owned by bookings and reject missing slots", async (t) => {
  const event = {
    _id: "event",
    itineraryID: ids.itinerary,
    title: "Hotel",
    address: "Hotel address",
    eventType: "hotel_checkin",
    reservation: ids.booking,
    ...slot,
  };
  t.mock.method(Event, "findById", async () => event);
  t.mock.method(Itinerary, "findById", async () => ({ tripId: ids.trip }));
  t.mock.method(Trip, "findById", async () => ({
    _id: ids.trip,
    ownerId: ids.owner,
    startDate: "2027-06-12",
    endDate: "2027-06-15",
  }));
  t.mock.method(Reservation, "findById", async () => ({
    trip: ids.trip,
    type: "accommodations",
    startTime: slot.startTime,
    endTime: "2027-06-15T10:00:00Z",
    accommodations: { address: event.address },
  }));
  t.mock.method(mongoose.connection, "transaction", async (callback) =>
    callback({}),
  );
  t.mock.method(Trip, "updateOne", async () => ({ matchedCount: 1 }));
  let changes;
  t.mock.method(Event, "findByIdAndUpdate", async (id, update) => {
    changes = update.$set;
    return { ...event, ...changes };
  });
  const req = {
    user: { id: ids.owner },
    params: { id: "event" },
    body: {
      reservation: "foreign",
      itineraryID: "foreign",
      title: "Tampered",
      address: "Tampered",
      notes: "Personal note",
      lat: 99,
      eventType: "hotel_checkin",
    },
  };
  let res = response();
  await updateEvent(req, res);
  assert.equal(res.code, 200);
  assert.deepEqual(changes, {
    notes: "Personal note",
    eventType: "hotel_checkin",
  });
  for (const body of [
    { eventType: "restaurant" },
    { startTime: null },
    { endTime: slot.startTime },
    { eventType: "unknown" },
    { startTime: "2027-06-13T15:00:00Z", endTime: "2027-06-13T15:30:00Z" },
  ]) {
    res = response();
    await updateEvent({ ...req, body }, res);
    assert.equal(res.code, 400);
  }
});

test("action uniqueness is a partial index built normally for the clean schema", () => {
  assert.notEqual(Event.schema.options.autoIndex, false);
  const [fields, options] = Event.schema
    .indexes()
    .find(([, options]) => options.name === "reservation_event_action");
  assert.deepEqual(fields, { reservation: 1, eventType: 1 });
  assert.equal(options.unique, true);
  assert.equal(options.partialFilterExpression.reservation.$type, "objectId");
  assert.equal(
    options.partialFilterExpression.eventType.$in.includes("activity"),
    false,
  );
});
