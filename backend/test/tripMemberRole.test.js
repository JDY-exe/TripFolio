const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const User = require("../models/User");
const tripRoutes = require("../routes/tripRoutes");

test("PATCH /trip/:id/members/:userId/role changes an existing member role", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "trip-member-role-test-secret";
  const original = {
    tripFindById: Trip.findById,
    userFindById: User.findById
  };
  const ids = Object.fromEntries(
    [
      "trip",
      "owner",
      "editor",
      "editorTwo",
      "viewer",
      "stranger",
      "missingUser"
    ].map((key) => [key, new mongoose.Types.ObjectId().toString()])
  );
  const makeTrip = () => {
    const trip = new Trip({
      _id: ids.trip,
      ownerId: ids.owner,
      users: [ids.owner, ids.editor, ids.editorTwo, ids.viewer],
      viewerIds: [ids.viewer],
      memberRoles: new Map(),
      name: "Role Test Trip", location: 'Test destination',
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-05")
    });
    trip.save = async function save(options) {
      await this.validate(options);
      return this;
    };
    return trip;
  };
  let trip = makeTrip();
  t.mock.method(Trip, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.version, trip.version);
    trip.set(update.$set); trip.version++;
    return trip;
  });
  const existingUsers = new Set([
    ids.owner,
    ids.editor,
    ids.editorTwo,
    ids.viewer
  ]);
  Trip.findById = async (tripId) => (String(tripId) === ids.trip ? trip : null);
  User.findById = async (userId) => (
    existingUsers.has(String(userId)) ? { _id: userId } : null
  );

  const app = express();
  app.use(express.json());
  app.use("/trip", tripRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const updateRole = async (userId, role, callerId = ids.owner, tripId = ids.trip) => {
    const response = await fetch(
      `${baseUrl}/trip/${tripId}/members/${userId}/role`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${jwt.sign({ id: callerId }, process.env.JWT_SECRET)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ expectedVersion: trip.version, changes: { [`memberRoles.${userId}`]: role }, original: { [`memberRoles.${userId}`]: trip.memberRoles.get(userId) ?? null } })
      }
    );
    return { response, data: await response.json() };
  };

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Trip.findById = original.tripFindById;
    User.findById = original.userFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  await t.test("owner can set viewer and editor roles", async () => {
    const viewerResult = await updateRole(ids.editor, "viewer");
    assert.equal(viewerResult.response.status, 200);
    assert.equal(viewerResult.data.member.role, "viewer");
    assert.equal(trip.memberRoles.get(ids.editor), "viewer");
    assert.deepEqual(trip.viewerIds.map(String), [ids.viewer, ids.editor]);

    const editorResult = await updateRole(ids.editor, "editor");
    assert.equal(editorResult.response.status, 200);
    assert.equal(editorResult.data.member.role, "editor");
    assert.equal(trip.memberRoles.get(ids.editor), "editor");
    assert.deepEqual(trip.viewerIds.map(String), [ids.viewer]);
  });

  await t.test("rejects invalid IDs, roles, and non-members", async () => {
    assert.equal((await updateRole("invalid-id", "viewer")).response.status, 400);
    assert.equal((await updateRole(ids.editor, "owner")).response.status, 400);
    assert.equal((await updateRole(ids.stranger, "viewer")).response.status, 404);
    assert.equal((await updateRole(ids.missingUser, "viewer")).response.status, 404);
    assert.equal((await updateRole(ids.owner, "viewer")).response.status, 400);
    assert.equal((await updateRole(ids.editor, "viewer", ids.viewer)).response.status, 403);
  });

  await t.test("an editor can change another member's role", async () => {
    const result = await updateRole(ids.editorTwo, "viewer", ids.editor);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.member.role, "viewer");
    assert.equal(trip.memberRoles.get(ids.editorTwo), "viewer");
    assert.deepEqual(trip.viewerIds.map(String), [ids.viewer, ids.editorTwo]);
  });

  await t.test("returns not found for a missing trip and requires authentication", async () => {
    assert.equal((await updateRole(ids.editor, "viewer", ids.owner, ids.stranger)).response.status, 404);
    const response = await fetch(
      `${baseUrl}/trip/${ids.trip}/members/${ids.editor}/role`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "viewer" }) }
    );
    assert.equal(response.status, 401);
  });
});
