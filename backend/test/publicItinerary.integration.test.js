const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Event = require("../models/event");
const Friendship = require("../models/Friendship");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const User = require("../models/User");
const publicItineraryRoutes = require("../routes/publicItineraryRoutes");

test("public itinerary endpoints expose only public read data", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "public-itinerary-integration-secret";
  const originalMethods = {
    aggregate: Trip.aggregate,
    findById: Trip.findById,
    friendshipFind: Friendship.find,
    itineraryFindOne: Itinerary.findOne,
    eventFind: Event.find,
    userFindById: User.findById,
  };
  const userId = new mongoose.Types.ObjectId();
  const friendId = new mongoose.Types.ObjectId();
  const ownerId = friendId;
  const publicTripId = new mongoose.Types.ObjectId();
  const privateTripId = new mongoose.Types.ObjectId();
  const itineraryId = new mongoose.Types.ObjectId();
  const tripRecords = new Map([
    [String(publicTripId), {
      _id: publicTripId,
      ownerId,
      isPublic: true,
      name: "Coastal weekend",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-03"),
    }],
    [String(privateTripId), {
      _id: privateTripId,
      ownerId,
      isPublic: false,
      name: "Private weekend",
    }],
  ]);
  const itinerary = {
    _id: itineraryId,
    tripId: publicTripId,
    title: "Three days by the sea",
    description: "A quiet weekend away",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-03"),
  };
  const events = [{ _id: new mongoose.Types.ObjectId(), title: "Harbor walk" }];
  let feedPipeline;
  let itineraryLookupCount = 0;

  Trip.aggregate = async (pipeline) => {
    feedPipeline = pipeline;
    return [
      {
        tripId: publicTripId,
        tripName: "Coastal weekend",
        isFriend: true,
        owner: { id: ownerId, username: "coastfriend" },
        itinerary: { _id: itineraryId, title: "Three days by the sea" },
      },
      {
        tripId: new mongoose.Types.ObjectId(),
        tripName: "Another public trip",
        isFriend: false,
        owner: { username: "traveler" },
        itinerary: { _id: new mongoose.Types.ObjectId(), title: "Another plan" },
      },
    ];
  };
  Trip.findById = async (id) => tripRecords.get(String(id)) || null;
  Friendship.find = async (filter) => {
    assert.equal(filter.status, "accepted");
    return [{ requester: userId, recipient: friendId }];
  };
  Itinerary.findOne = async ({ tripId }) => {
    itineraryLookupCount += 1;
    return String(tripId) === String(publicTripId) ? itinerary : null;
  };
  Event.find = (filter) => ({
    sort: async (sort) => {
      assert.equal(String(filter.itineraryID), String(itineraryId));
      assert.deepEqual(sort, { startTime: 1 });
      return events;
    },
  });
  User.findById = (id) => ({
    select: async (fields) => {
      const isCurrentUser = String(id) === String(userId);
      assert.equal(fields, isCurrentUser ? "friends" : "username profile_picture");
      return isCurrentUser
        ? { friends: [] }
        : { _id: ownerId, username: "coastfriend", profile_picture: null };
    },
  });

  const app = express();
  app.use(express.json());
  app.use("/api/itineraries", publicItineraryRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ id: String(userId) }, process.env.JWT_SECRET);
  const send = (path) => fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    Trip.aggregate = originalMethods.aggregate;
    Trip.findById = originalMethods.findById;
    Friendship.find = originalMethods.friendshipFind;
    Itinerary.findOne = originalMethods.itineraryFindOne;
    Event.find = originalMethods.eventFind;
    User.findById = originalMethods.userFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const feedResponse = await send("/api/itineraries/feed?page=0&limit=1");
  const feed = await feedResponse.json();
  assert.equal(feedResponse.status, 200);
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].isFriend, true);
  assert.equal(feed.nextPage, 1);
  assert.deepEqual(feedPipeline[0], { $match: { isPublic: true } });
  assert.deepEqual(feedPipeline[5], {
    $addFields: { isFriend: { $in: ["$ownerId", [friendId]] } },
  });
  assert.deepEqual(feedPipeline[6], {
    $sort: { isFriend: -1, "itinerary.createdAt": -1, _id: 1 },
  });
  assert.deepEqual(feedPipeline[7], { $skip: 0 });
  assert.deepEqual(feedPipeline[8], { $limit: 2 });

  const publicResponse = await send(`/api/itineraries/${publicTripId}`);
  const publicDetails = await publicResponse.json();
  assert.equal(publicResponse.status, 200);
  assert.equal(publicDetails.trip.name, "Coastal weekend");
  assert.equal(publicDetails.owner.username, "coastfriend");
  assert.deepEqual(publicDetails.events, [{ _id: String(events[0]._id), title: "Harbor walk" }]);

  const previousLookupCount = itineraryLookupCount;
  const privateResponse = await send(`/api/itineraries/${privateTripId}`);
  assert.equal(privateResponse.status, 404);
  assert.equal(itineraryLookupCount, previousLookupCount);
});