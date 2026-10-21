require("./helpers/mockTripWrites");
const assert = require("node:assert/strict");
const test = require("node:test");
const Event = require("../models/event");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const MapLocation = require("../models/MapLocation");
const { getEventLocation } = require("../controllers/eventLocationController");
const { createEvent, updateEvent } = require("../controllers/eventController");

test("event coordinates stay scoped to trip members and follow the saved address", async (t) => {
  const original = [
    Event.findById,
    Itinerary.findById,
    Trip.findById,
    MapLocation.findOne,
    Event.updateOne,
  ];
  t.after(() => {
    [
      Event.findById,
      Itinerary.findById,
      Trip.findById,
      MapLocation.findOne,
      Event.updateOne,
    ] = original;
  });
  Event.findById = async () => ({
    _id: "event",
    itineraryID: "itinerary",
    address: "Location test address",
  });
  Itinerary.findById = async () => ({ tripId: "trip" });
  Trip.findById = async () => ({
    ownerId: "owner",
    users: ["owner", "member"],
  });
  let lookups = 0;
  MapLocation.findOne = async () => {
    lookups++;
    return { lat: 0, lng: 0 };
  };
  let saved;
  Event.updateOne = async (filter, update) => {
    saved = { filter, update };
  };
  const response = () => ({
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  });
  const denied = response();
  await getEventLocation(
    { params: { id: "event" }, user: { id: "stranger" } },
    denied,
  );
  assert.equal(denied.statusCode, 404);
  assert.equal(lookups, 0);
  const allowed = response();
  await getEventLocation(
    { params: { id: "event" }, user: { id: "member" } },
    allowed,
  );
  assert.deepEqual(allowed.body, { location: { lat: 0, lng: 0 } });
  assert.deepEqual(saved.filter, {
    _id: "event",
    address: "Location test address",
    placeId: undefined,
  });
});

test("saved coordinates skip lookups and older Google places resolve by ID", async (t) => {
  const original = [
    Event.findById,
    Itinerary.findById,
    Trip.findById,
    Event.updateOne,
    global.fetch,
    process.env.GOOGLE_API_KEY,
  ];
  t.after(() => {
    [
      Event.findById,
      Itinerary.findById,
      Trip.findById,
      Event.updateOne,
      global.fetch,
    ] = original;
    if (original[5] === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = original[5];
  });
  process.env.GOOGLE_API_KEY = "test-key";
  let event = {
    _id: "event",
    itineraryID: "itinerary",
    address: "Detailed address",
    placeId: "places/tower",
    lat: 0,
    lng: 0,
  };
  Event.findById = async () => event;
  Itinerary.findById = async () => ({ tripId: "trip" });
  Trip.findById = async () => ({ ownerId: "owner" });
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://places.googleapis.com/v1/places/tower");
    assert.equal(options.headers["X-Goog-FieldMask"], "location");
    return {
      ok: true,
      json: async () => ({
        location: { latitude: 35.658, longitude: 139.745 },
      }),
    };
  };
  const res = {
    json(body) {
      this.body = body;
      return this;
    },
    status() {
      return this;
    },
  };
  const req = { params: { id: "event" }, user: { id: "owner" } };
  await getEventLocation(req, res);
  assert.deepEqual(res.body.location, { lat: 0, lng: 0 });
  assert.equal(calls, 0);
  event = { ...event, lat: null, lng: null };
  Event.updateOne = async (filter, update) => {
    assert.equal(filter.placeId, "places/tower");
    Object.assign(event, update.$set);
  };
  await getEventLocation(req, res);
  assert.deepEqual(res.body.location, { lat: 35.658, lng: 139.745 });
  await getEventLocation(req, res);
  assert.equal(calls, 1);
});

test("event saves store Google coordinates and clear stale coordinates when the place changes", async (t) => {
  const original = [
    Itinerary.findById,
    Trip.findById,
    Event.prototype.save,
    Event.findById,
    Event.findByIdAndUpdate,
    global.fetch,
    process.env.GOOGLE_API_KEY,
  ];
  t.after(() => {
    [
      Itinerary.findById,
      Trip.findById,
      Event.prototype.save,
      Event.findById,
      Event.findByIdAndUpdate,
      global.fetch,
    ] = original;
    if (original[6] === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = original[6];
  });
  process.env.GOOGLE_API_KEY = "test-key";
  Itinerary.findById = async () => ({ tripId: "trip" });
  Trip.findById = async () => ({ ownerId: "owner" });
  let event;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({ location: { latitude: 0, longitude: 12 } }),
    };
  };
  Event.prototype.save = async function () {
    event = this;
    return this;
  };
  const response = {
    status() {
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await createEvent(
    {
      user: { id: "owner" },
      body: {
        itineraryID: "itinerary",
        title: "Place",
        placeId: "first",
        address: "Address",
      },
    },
    response,
  );
  assert.equal(response.body.lat, 0);
  assert.equal(response.body.lng, 12);
  assert.equal(calls, 1);
  Event.findById = async () => event;
  Event.findByIdAndUpdate = async (id, update) => {
    Object.assign(event, update.$set);
    return event;
  };
  await updateEvent(
    {
      user: { id: "owner" },
      params: { id: "event" },
      body: { title: "Renamed" },
    },
    response,
  );
  assert.equal(calls, 1);
  assert.equal(event.lng, 12);
  global.fetch = async () => {
    calls++;
    throw new Error("Provider unavailable");
  };
  await updateEvent(
    {
      user: { id: "owner" },
      params: { id: "event" },
      body: { placeId: "second" },
    },
    response,
  );
  assert.equal(calls, 2);
  assert.equal(event.lat, null);
  assert.equal(event.lng, null);
  assert.equal(event.placeId, "second");
});
