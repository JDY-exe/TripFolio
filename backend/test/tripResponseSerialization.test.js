const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Trip = require("../models/trip");
const User = require("../models/User");
const tripRoutes = require("../routes/tripRoutes");

test("trip lists do not expose archived sharing recipient IDs", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "trip-response-serialization-test-secret";

  const original = {
    tripFind: Trip.find,
    userFind: User.find
  };
  const userId = new mongoose.Types.ObjectId().toString();
  const recipientId = new mongoose.Types.ObjectId().toString();
  const tripId = new mongoose.Types.ObjectId().toString();
  const trip = {
    _id: tripId,
    ownerId: userId,
    users: [userId],
    archivedSharedWith: [recipientId],
    toObject() {
      return {
        _id: this._id,
        ownerId: this.ownerId,
        users: this.users,
        archivedSharedWith: this.archivedSharedWith
      };
    }
  };
  let findCalls = 0;

  Trip.find = () => {
    findCalls += 1;
    if (findCalls === 1) return { sort: async () => [trip] };
    return Promise.resolve([trip]);
  };
  User.find = () => ({
    select: () => ({
      lean: async () => [{ _id: userId, username: "owner", profile_picture: null }]
    })
  });

  const app = express();
  app.use("/trip", tripRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = {
    Authorization: `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET)}`
  };

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Trip.find = original.tripFind;
    User.find = original.userFind;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const activeTripsResponse = await fetch(`${baseUrl}/trip`, { headers });
  const activeTrips = await activeTripsResponse.json();
  assert.equal(activeTripsResponse.status, 200);
  assert.equal("archivedSharedWith" in activeTrips[0], false);

  const userTripsResponse = await fetch(`${baseUrl}/trip/user`, { headers });
  const userTrips = await userTripsResponse.json();
  assert.equal(userTripsResponse.status, 200);
  assert.equal("archivedSharedWith" in userTrips.trips[0], false);
});
