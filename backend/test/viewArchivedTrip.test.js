
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Trip = require("../models/trip");
const tripRoutes = require("../routes/tripRoutes");

test("a user can view an archived trip in viewer mode", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "view-archived-trip-test-secret";

  const originalFindById = Trip.findById;

  const userId = new mongoose.Types.ObjectId().toString();
  const tripId = new mongoose.Types.ObjectId().toString();

  const trip = {
    _id: new mongoose.Types.ObjectId(tripId),
    name: "Archived Vacation",
    ownerId: userId,
    users: [userId],
    viewerIds: [],
    archived: true,
    isPublic: false,
    startDate: new Date("2020-01-01"),
    endDate: new Date("2020-01-05"),
  };

  Trip.findById = async (id) => {
    return String(id) === tripId ? trip : null;
  };

  const app = express();
  app.use(express.json());

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
    `http://127.0.0.1:${server.address().port}/trip/archived/${tripId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);

  // Verify the correct trip was returned.
  assert.equal(String(data._id), tripId);
  assert.equal(data.name, "Archived Vacation");
  assert.equal(data.archived, true);

  // Archived trips should be returned in viewer mode.
  assert.equal(data.currentUserRole, "viewer");
});
