const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Trip = require("../models/trip");
const User = require("../models/User");
const tripRoutes = require("../routes/tripRoutes");

test("GET /trip/archived includes shared trips and labels them for the recipient", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "archived-trip-list-test-secret";

  const original = {
    tripFind: Trip.find,
    userFind: User.find
  };
  const userId = new mongoose.Types.ObjectId().toString();
  const ownerId = new mongoose.Types.ObjectId().toString();
  const memberTripId = new mongoose.Types.ObjectId().toString();
  const sharedTripId = new mongoose.Types.ObjectId().toString();
  const trips = [
    {
      _id: memberTripId,
      ownerId,
      users: [ownerId, userId],
      archived: true,
      archivedSharedWith: []
    },
    {
      _id: sharedTripId,
      ownerId,
      users: [ownerId],
      archived: true,
      archivedSharedWith: [userId]
    }
  ];
  const profiles = [
    { _id: ownerId, username: "trip-owner", profile_picture: null },
    { _id: userId, username: "recipient", profile_picture: null }
  ];
  let findFilter;
  let travelerIds;

  Trip.find = (filter) => {
    findFilter = filter;
    return { sort: async () => trips };
  };
  User.find = (filter) => {
    travelerIds = filter._id.$in;
    return {
      select: () => ({
        lean: async () =>
          profiles.filter((profile) => travelerIds.includes(String(profile._id)))
      })
    };
  };

  const app = express();
  app.use("/trip", tripRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Trip.find = original.tripFind;
    User.find = original.userFind;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/trip/archived`,
    {
      headers: {
        Authorization: `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET)}`
      }
    }
  );
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(findFilter.archived.$eq, true);
  assert.deepEqual(findFilter.$or, [
    { ownerId: userId },
    { users: userId },
    { archivedSharedWith: userId }
  ]);
  assert.deepEqual(data.map((trip) => trip._id), [memberTripId, sharedTripId]);
  assert.equal(data[0].sharedWithYou, false);
  assert.equal(data[1].sharedWithYou, true);
  assert.equal("archivedSharedWith" in data[1], false);
  assert.deepEqual(data[1].travelers.map((traveler) => traveler.id), [ownerId]);
});
