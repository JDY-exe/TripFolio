const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Trip = require("../models/trip");
const TripInvitation = require("../models/TripInvitation");
const User = require("../models/User");
const tripRoutes = require("../routes/tripRoutes");

test("POST /trip/:id/share-archive grants archived access without membership", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "archived-trip-sharing-test-secret";

  const original = {
    tripFindById: Trip.findById,
    userFindById: User.findById,
    invitationFind: TripInvitation.find,
    invitationFindOne: TripInvitation.findOne,
    invitationCreate: TripInvitation.create,
    transaction: mongoose.connection.transaction
  };
  const ids = Object.fromEntries(
    ["trip", "owner", "editor", "viewer", "stranger", "recipient", "member", "unknown"]
      .map((key) => [key, new mongoose.Types.ObjectId().toString()])
  );
  const trip = {
    _id: ids.trip,
    ownerId: ids.owner,
    users: [ids.owner, ids.editor, ids.viewer, ids.member],
    viewerIds: [ids.viewer],
    memberRoles: new Map([[ids.viewer, "viewer"]]),
    archived: true,
    archivedSharedWith: []
  };
  const profiles = new Set(
    Object.entries(ids)
      .filter(([key]) => !["trip", "unknown"].includes(key))
      .map(([, id]) => id)
  );
  const session = {};
  const invitations = [];
  let transactions = 0;

  mongoose.connection.transaction = async (callback) => {
    transactions += 1;
    return callback(session);
  };
  Trip.findById = (tripId) => ({
    session: async (currentSession) => {
      assert.equal(currentSession, session);
      return String(tripId) === ids.trip ? trip : null;
    }
  });
  User.findById = (userId) => ({
    session: async (currentSession) => {
      assert.equal(currentSession, session);
      return profiles.has(String(userId)) ? { _id: userId } : null;
    }
  });
  TripInvitation.findOne = (filter) => ({
    session: async (currentSession) => {
      assert.equal(currentSession, session);
      return invitations.find((invitation) =>
        invitation.trip === String(filter.trip) &&
        invitation.recipient === String(filter.recipient) &&
        invitation.status === filter.status
      ) ?? null;
    }
  });
  TripInvitation.find = (filter) => ({
    populate() {
      return this;
    },
    sort() {
      return invitations.filter((invitation) =>
        invitation.recipient === String(filter.recipient) &&
        invitation.status === filter.status
      ).map((invitation) => ({
        ...invitation,
        tripRecord: {
          _id: ids.trip,
          name: "Archived trip",
          startDate: new Date("2020-01-01"),
          endDate: new Date("2020-01-05"),
          archived: true,
          ownerId: { username: "trip-owner", profile_picture: null }
        },
        inviterRecord: { username: "trip-sender" }
      }));
    }
  });
  TripInvitation.create = async (documents, options) => {
    assert.equal(options.session, session);
    const [invitation] = documents.map((document) => ({
      _id: new mongoose.Types.ObjectId().toString(),
      ...document,
      status: "pending"
    }));
    invitations.push(invitation);
    return [invitation];
  };

  const app = express();
  app.use(express.json());
  app.use("/trip", tripRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const send = async (body, userId = ids.owner, tripId = ids.trip) => {
    const response = await fetch(`${baseUrl}/trip/${tripId}/share-archive`, {
      method: "POST",
      headers: {
        ...(userId
          ? {
              Authorization: `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET)}`
            }
          : {}),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    return { response, data: await response.json() };
  };

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Trip.findById = original.tripFindById;
    User.findById = original.userFindById;
    TripInvitation.find = original.invitationFind;
    TripInvitation.findOne = original.invitationFindOne;
    TripInvitation.create = original.invitationCreate;
    mongoose.connection.transaction = original.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  await t.test("owners and editors create pending read-only invitations", async () => {
    const originalMembers = [...trip.users];

    for (const sharer of [ids.owner, ids.editor]) {
      const recipientId = sharer === ids.owner ? ids.recipient : ids.stranger;
      const { response, data } = await send({ recipientId }, sharer);
      assert.equal(response.status, 201);
      assert.equal(data.message, "Archived trip invitation sent");
      assert.equal(data.tripId, ids.trip);
      assert.equal(data.recipientId, recipientId);
      const invitation = invitations.at(-1);
      assert.equal(invitation.recipient, recipientId);
      assert.equal(invitation.inviter, sharer);
      assert.equal(invitation.archivedReadOnly, true);
      assert.equal(invitation.role, "viewer");
      assert.equal(invitation.status, "pending");
    }

    const repeated = await send({ recipientId: ids.recipient });
    assert.equal(repeated.response.status, 409);
    assert.deepEqual(trip.archivedSharedWith, []);
    assert.deepEqual(trip.users, originalMembers);

    const invitationsResponse = await fetch(`${baseUrl}/trip/invitations`, {
      headers: {
        Authorization: `Bearer ${jwt.sign(
          { id: ids.recipient },
          process.env.JWT_SECRET
        )}`
      }
    });
    const invitationData = await invitationsResponse.json();
    assert.equal(invitationsResponse.status, 200);
    assert.equal(invitationData.invites.length, 1);
    assert.equal(invitationData.invites[0].archivedReadOnly, true);
    assert.equal(invitationData.invites[0].trip.archived, true);
    assert.equal(invitationData.invites[0].inviter.username, "trip-sender");
  });

  await t.test("rejects malformed identifiers before starting a transaction", async () => {
    const before = transactions;
    for (const [body, tripId] of [
      [{}, ids.trip],
      [{ recipientId: "invalid" }, ids.trip],
      [{ recipientId: ids.recipient }, "invalid"]
    ]) {
      const { response } = await send(body, ids.owner, tripId);
      assert.equal(response.status, 400);
    }
    assert.equal(transactions, before);
  });

  await t.test("requires a share-capable participant and an archived trip", async () => {
    for (const [sharer, tripId, status] of [
      [null, ids.trip, 401],
      [ids.viewer, ids.trip, 403],
      [ids.stranger, ids.trip, 403],
      [ids.owner, new mongoose.Types.ObjectId().toString(), 404]
    ]) {
      assert.equal(
        (await send({ recipientId: ids.recipient }, sharer, tripId)).response.status,
        status
      );
    }

    trip.archived = false;
    assert.equal(
      (await send({ recipientId: ids.recipient })).response.status,
      409
    );
    trip.archived = true;
  });

  await t.test("rejects missing recipients and existing trip members", async () => {
    assert.equal(
      (await send({ recipientId: ids.unknown })).response.status,
      404
    );
    assert.equal(
      (await send({ recipientId: ids.member })).response.status,
      409
    );
    assert.deepEqual(trip.archivedSharedWith, []);
  });
});
