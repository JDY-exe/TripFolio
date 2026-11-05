
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Trip = require("../models/trip");
const tripRoutes = require("../routes/tripRoutes");

test("a user can hide themselves from a public trip", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "hide-public-trip-test-secret";

  const originalFindById = Trip.findById;

  const userId = new mongoose.Types.ObjectId().toString();
  const tripId = new mongoose.Types.ObjectId().toString();

  // Simulate a Mongoose array.
  const hiddenUsers = [];

  hiddenUsers.addToSet = function (value) {
    if (!this.some((id) => String(id) === String(value))) {
      this.push(value);
    }
  };

  hiddenUsers.pull = function (value) {
    const index = this.findIndex(
      (id) => String(id) === String(value)
    );

    if (index !== -1) {
      this.splice(index, 1);
    }
  };

  let saveCalls = 0;

  const trip = new Trip({
    location: 'Test destination', startDate: new Date('2020-01-01'), endDate: new Date('2020-01-05'),
    _id: new mongoose.Types.ObjectId(tripId),
    name: "Public Vacation",
    ownerId: userId,
    users: [userId],
    viewerIds: [],
    isPublic: true,
    hiddenUsers,
  });
  t.mock.method(Trip, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.version, trip.version);
    trip.set(update.$set); trip.version++; saveCalls++;
    return trip;
  });

  Trip.findById = async (id) => {
    return String(id) === tripId ? trip : null;
  };

  const app = express();
  app.use(express.json());

  // Supplies an authenticated user for routes without auth middleware.
  app.use((req, res, next) => {
    req.user = { id: userId };
    next();
  });

  app.use("/trip", tripRoutes);

  const server = createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const token = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET
  );

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));

    Trip.findById = originalFindById;

    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/trip/hideUser`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tripId, expectedVersion: trip.version, changes: { hiddenUsers: [userId] }, original: { hiddenUsers: [] } }),
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(
    data.message,
    "User visibility updated successfully"
  );
  assert.equal(data.hidden, true);

  // Verify the user was added to hiddenUsers.
  assert.equal(trip.hiddenUsers.length, 1);
  assert.equal(String(trip.hiddenUsers[0]), userId);

  // Verify the trip was saved.
  assert.equal(saveCalls, 1);
});
