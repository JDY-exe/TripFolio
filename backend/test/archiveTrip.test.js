const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Trip = require("../models/trip");
const tripRoutes = require("../routes/tripRoutes");

test("a trip member can archive a trip that has ended", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "archive-trip-test-secret";

  const originalFindById = Trip.findById;

  const userId = new mongoose.Types.ObjectId().toString();
  const editorId = new mongoose.Types.ObjectId().toString();
  const viewerId = new mongoose.Types.ObjectId().toString();
  const tripId = new mongoose.Types.ObjectId().toString();

  let saveCalls = 0;

  const trip = {
    _id: new mongoose.Types.ObjectId(tripId),
    name: "Completed Vacation",
    ownerId: userId,
    users: [userId, editorId, viewerId],
    viewerIds: [viewerId],
    memberRoles: new Map([[viewerId, "viewer"]]),
    startDate: new Date("2020-01-01"),
    endDate: new Date("2020-01-05"),
    archived: false,

    async save() {
      saveCalls++;
      return this;
    },
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

  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

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
    `http://127.0.0.1:${server.address().port}/trip/archive`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tripId }),
    },
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.message, "Trip archived successfully");
  assert.equal(data.tripId, tripId);
  assert.equal(data.archived, true);

  // Verify the archived value was changed on the trip.
  assert.equal(trip.archived, true);

  // Verify the trip was saved.
  assert.equal(saveCalls, 1);

  trip.archived = false;
  const viewerToken = jwt.sign({ id: viewerId }, process.env.JWT_SECRET);
  const viewerResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/trip/archive`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ tripId }),
    },
  );
  assert.equal(viewerResponse.status, 403);
  assert.equal(trip.archived, false);
  assert.equal(saveCalls, 1);

  const editorToken = jwt.sign({ id: editorId }, process.env.JWT_SECRET);
  const editorResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/trip/archive`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${editorToken}`,
      },
      body: JSON.stringify({ tripId }),
    },
  );
  assert.equal(editorResponse.status, 200);
  assert.equal(trip.archived, true);
  assert.equal(saveCalls, 2);

  const archivedVisibilityUpdate = await fetch(
    `http://127.0.0.1:${server.address().port}/trip/${tripId}/visibility`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isPublic: true }),
    },
  );
  assert.equal(archivedVisibilityUpdate.status, 409);

  const archivedMemberRoleUpdate = await fetch(
    `http://127.0.0.1:${server.address().port}/trip/${tripId}/members/${viewerId}/role`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: "editor" }),
    },
  );
  assert.equal(archivedMemberRoleUpdate.status, 403);

  const unarchiveResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/trip/archive`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${editorToken}`,
      },
      body: JSON.stringify({ tripId }),
    },
  );
  assert.equal(unarchiveResponse.status, 200);
  assert.equal(trip.archived, false);
  assert.equal(saveCalls, 3);
});
