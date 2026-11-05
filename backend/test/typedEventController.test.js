const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Event = require("../models/event");
const Reservation = require("../models/Reservation");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const { createEvent, updateEvent } = require("../controllers/eventController");
const ids = Object.fromEntries(
  ["trip", "otherTrip", "booking", "itinerary", "owner", "event"].map((key) => [
    key,
    String(new mongoose.Types.ObjectId()),
  ]),
);
const slot = {
  startTime: "2027-06-12T15:00:00Z",
  endTime: "2027-06-12T15:30:00Z",
};
const response = () => ({
  code: 200,
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
const mockParents = (t) => {
  t.mock.method(Itinerary, "findById", async () => ({ tripId: ids.trip }));
  t.mock.method(Trip, "findById", async () => ({
    _id: ids.trip,
    ownerId: ids.owner,
    startDate: "2027-06-12",
    endDate: "2027-06-15",
  }));
  t.mock.method(mongoose.connection, "transaction", async (callback) =>
    callback({}),
  );
  t.mock.method(Reservation, "updateOne", async () => ({ matchedCount: 1 }));
};
test("typed event creation checks booking ownership/category and returns duplicate conflicts", async (t) => {
  mockParents(t);
  const booking = {
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
  t.mock.method(Event.prototype, "save", async function () {
    return this;
  });
  res = response();
  await createEvent(req, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.version, 0);
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
test("checked event updates protect linked identity and validate complete merged slots", async (t) => {
  mockParents(t);
  let event = Event.hydrate({
    _id: ids.event,
    itineraryID: ids.itinerary,
    title: "Hotel",
    address: "Hotel address",
    eventType: "hotel_checkin",
    reservation: ids.booking,
    version: 0,
    ...slot,
  });
  t.mock.method(Event, "findById", async () => event);
  t.mock.method(Reservation, "findById", async () => ({
    _id: ids.booking,
    trip: ids.trip,
    type: "accommodations",
    startTime: slot.startTime,
    endTime: "2027-06-15T10:00:00Z",
    accommodations: { address: event.address },
  }));
  let changes;
  t.mock.method(Event, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter.version, event.version);
    changes = update.$set;
    event = Event.hydrate({
      ...event.toObject(),
      ...changes,
      version: event.version + 1,
    });
    return event;
  });
  const req = { user: { id: ids.owner }, params: { id: ids.event } };
  const checked = (values) => ({
    expectedVersion: event.version,
    changes: values,
    original: Object.fromEntries(
      Object.keys(values).map((key) => [key, event.get(key) ?? null]),
    ),
  });
  let res = response();
  await updateEvent({ ...req, body: checked({ notes: "Personal note" }) }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(changes, { notes: "Personal note" });
  assert.equal(event.version, 1);
  for (const values of [
    { title: "Tampered" },
    { address: "Tampered", placeId: null },
    { reservation: ids.otherTrip },
    { itineraryID: ids.otherTrip },
    { lat: 99 },
    { eventType: "restaurant" },
    { startTime: null },
    { endTime: slot.startTime },
    { eventType: "unknown" },
    { startTime: "2027-06-13T15:00:00Z", endTime: "2027-06-13T15:30:00Z" },
  ]) {
    res = response();
    await updateEvent({ ...req, body: checked(values) }, res);
    assert.equal(res.code, 400, JSON.stringify(values));
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
