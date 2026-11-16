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

test("POST /trip/:id/share-archive sends atomic archived read-only invitation batches without membership", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "archived-trip-sharing-test-secret";

  const original = {
    tripFindById: Trip.findById,
    userFind: User.find,
    invitationFind: TripInvitation.find,
    invitationFindOne: TripInvitation.findOne,
    invitationInsertMany: TripInvitation.insertMany,
    transaction: mongoose.connection.transaction
  };
  const ids = Object.fromEntries(
    ["trip", "owner", "editor", "viewer", "stranger", "recipient", "member", "unknown", "batchA", "batchB", "batchC", "batchD"]
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
  let failInsert = false;

  mongoose.connection.transaction = async (callback) => {
    transactions += 1;
    const originalCount = invitations.length;
    try { return await callback(session); }
    catch (error) { invitations.splice(originalCount); throw error; }
  };
  Trip.findById = (tripId) => ({
    session: async (currentSession) => {
      assert.equal(currentSession, session);
      return String(tripId) === ids.trip ? trip : null;
    }
  });
  User.find = (filter) => ({
    session: async (currentSession) => {
      assert.equal(currentSession, session);
      return filter._id.$in.filter((id) => profiles.has(String(id))).map((id) => ({ _id: id }));
    }
  });
  TripInvitation.findOne = (filter) => ({
    session: async (currentSession) => {
      assert.equal(currentSession, session);
      return invitations.find((invitation) =>
        invitation.trip === String(filter.trip) &&
        (filter.recipient.$in ?? [filter.recipient]).includes(invitation.recipient) &&
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
  TripInvitation.insertMany = async (documents, options) => {
    assert.equal(options.session, session);
    assert.equal(options.ordered, true);
    const created = documents.map((document) => ({
      _id: new mongoose.Types.ObjectId().toString(), ...document, status: "pending"
    }));
    if (failInsert) {
      invitations.push(created[0]);
      throw Object.assign(new Error("Duplicate pending invitation"), { code: 11000 });
    }
    invitations.push(...created);
    return created;
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
    User.find = original.userFind;
    TripInvitation.find = original.invitationFind;
    TripInvitation.findOne = original.invitationFindOne;
    TripInvitation.insertMany = original.invitationInsertMany;
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
  await t.test("creates every selected recipient's viewer invitation in one transaction", async () => {
    const before = transactions;
    const originalMembers = [...trip.users];
    const { response, data } = await send({ recipientIds: [ids.batchA, ids.batchB], role: "editor" }, ids.editor);
    assert.equal(response.status, 201);
    assert.equal(data.message, "Archived trip invitations sent");
    assert.deepEqual(data.recipientIds, [ids.batchA, ids.batchB]);
    assert.equal(data.invitations.length, 2);
    assert.equal(transactions, before + 1);
    for (const invitation of data.invitations) {
      assert.equal(invitation.role, "viewer");
      assert.equal(invitation.archivedReadOnly, true);
      assert.equal(invitation.status, "pending");
      assert.equal(invitation.inviter, ids.editor);
    }
    assert.deepEqual(trip.users, originalMembers);
    assert.deepEqual(trip.archivedSharedWith, []);
  });

  await t.test("rejects empty, invalid, and normalized duplicate batches before writing", async () => {
    const before = transactions;
    for (const recipientIds of [[], "bad", null, [ids.batchC, "bad"], [ids.batchC, ids.batchC.toUpperCase()]]) {
      assert.equal((await send({ recipientIds })).response.status, 400);
    }
    assert.equal(transactions, before);
  });

  await t.test("a missing profile, member, shared recipient, or pending invite rejects the whole batch", async () => {
    const before = invitations.length;
    for (const [recipientIds, status] of [
      [[ids.batchC, ids.unknown], 404],
      [[ids.batchC, ids.member], 409],
      [[ids.batchC, ids.batchA], 409]
    ]) {
      assert.equal((await send({ recipientIds })).response.status, status);
      assert.equal(invitations.length, before);
    }
    trip.archivedSharedWith = [ids.batchD];
    assert.equal((await send({ recipientIds: [ids.batchC, ids.batchD] })).response.status, 409);
    assert.equal(invitations.length, before);
    trip.archivedSharedWith = [];
  });

  await t.test("rolls back insertion conflicts and permits a complete retry", async () => {
    const before = invitations.length;
    failInsert = true;
    const failed = await send({ recipientIds: [ids.batchC, ids.batchD] });
    assert.equal(failed.response.status, 409);
    assert.equal(invitations.length, before);
    failInsert = false;
    assert.equal((await send({ recipientIds: [ids.batchC, ids.batchD] })).response.status, 201);
    assert.equal(invitations.length, before + 2);
  });

});
