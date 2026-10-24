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

test("POST /trip/:id/share creates an atomic batch of invitations", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "trip-share-test-secret";
  const original = {
    tripFindById: Trip.findById,
    tripUpdateOne: Trip.updateOne,
    userFind: User.find,
    invitationFindOne: TripInvitation.findOne,
    invitationInsertMany: TripInvitation.insertMany,
    transaction: mongoose.connection.transaction,
  };
  const ids = Object.fromEntries(
    [
      "trip",
      "owner",
      "editor",
      "viewer",
      "stranger",
      "recipient",
      "member",
      "recipient2",
      "unknownProfile",
    ].map((key) => [key, new mongoose.Types.ObjectId().toString()]),
  );
  const trip = {
    _id: ids.trip,
    ownerId: ids.owner,
    users: [ids.owner, ids.editor, ids.viewer, ids.member],
    viewerIds: [ids.viewer],
  };
  const profiles = new Set(
    Object.entries(ids)
      .filter(([key]) => !["trip", "unknownProfile"].includes(key))
      .map(([, id]) => id),
  );
  let invitations = [];
  let activeSession;
  let insertError;
  let transactions = 0;
  let inserts = 0;
  // Model a session's staged writes separately from committed data. Every read
  // and write must receive that same session for this controller contract test.
  mongoose.connection.transaction = async (callback) => {
    transactions += 1;
    activeSession = { staged: [] };
    try {
      const result = await callback(activeSession);
      invitations.push(...activeSession.staged);
      return result;
    } finally {
      activeSession = undefined;
    }
  };
  const query = (read) => ({
    session: async (session) => {
      assert.ok(activeSession);
      assert.equal(session, activeSession);
      return read();
    },
  });
  Trip.findById = (tripId) =>
    query(() => (String(tripId) === ids.trip ? trip : null));
  Trip.updateOne = async (filter, update, options) => {
    assert.equal(options.session, activeSession);
  };
  User.find = ({ _id }) =>
    query(() =>
      _id.$in.filter((id) => profiles.has(id)).map((id) => ({ _id: id })),
    );
  TripInvitation.findOne = ({ trip: tripId, recipient, status }) =>
    query(
      () =>
        invitations.find(
          (invitation) =>
            invitation.trip === tripId &&
            recipient.$in.includes(invitation.recipient) &&
            invitation.status === status,
        ) ?? null,
    );
  TripInvitation.insertMany = async (documents, options) => {
    inserts += 1;
    assert.ok(activeSession);
    assert.equal(options.session, activeSession);
    assert.equal(options.ordered, true);
    for (const document of documents) {
      activeSession.staged.push({
        ...document,
        _id: new mongoose.Types.ObjectId().toString(),
        status: "pending",
      });
      // Simulate a write failing after the first document was inserted.
      if (insertError) throw insertError;
    }
    return activeSession.staged;
  };

  const app = express();
  app.use(express.json());
  app.use("/trip", tripRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const send = async (body, userId = ids.owner, tripId = ids.trip) => {
    const response = await fetch(`${baseUrl}/trip/${tripId}/share`, {
      method: "POST",
      headers: {
        ...(userId
          ? {
              Authorization: `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET)}`,
            }
          : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return { response, data: await response.json() };
  };
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Trip.findById = original.tripFindById;
    Trip.updateOne = original.tripUpdateOne;
    User.find = original.userFind;
    TripInvitation.findOne = original.invitationFindOne;
    TripInvitation.insertMany = original.invitationInsertMany;
    mongoose.connection.transaction = original.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  await t.test("owners and editors can send the entire batch", async () => {
    for (const inviter of [ids.owner, ids.editor]) {
      invitations = [];
      const { response, data } = await send(
        { recipientIds: [ids.recipient, ids.recipient2] },
        inviter,
      );
      assert.equal(response.status, 201);
      assert.equal(invitations.length, 2);
      assert.deepEqual(
        data.invitations.map((invitation) => invitation.recipient),
        [ids.recipient, ids.recipient2],
      );
      for (const invitation of data.invitations) {
        assert.equal(invitation.trip, ids.trip);
        assert.equal(invitation.inviter, inviter);
        assert.equal(invitation.status, "pending");
      }
      assert.deepEqual(trip.users, [
        ids.owner,
        ids.editor,
        ids.viewer,
        ids.member,
      ]);
    }
    invitations = [];
  });
  await t.test(
    "rejects malformed or duplicate recipient IDs before starting a transaction",
    async () => {
      const before = transactions;
      for (const body of [
        {},
        { recipientId: ids.recipient },
        { recipientIds: [] },
        { recipientIds: ids.recipient },
        { recipientIds: [ids.recipient, "bad-id"] },
        { recipientIds: [null] },
        { recipientIds: [ids.recipient, ids.recipient] },
        { recipientIds: [ids.recipient, ids.recipient.toUpperCase()] },
      ]) {
        const { response } = await send(body);
        assert.equal(response.status, 400);
      }
      assert.equal(transactions, before);
      assert.equal(invitations.length, 0);
    },
  );
  await t.test(
    "rejects the entire batch if any recipient is missing or already a member",
    async () => {
      for (const [recipient, status] of [
        [ids.unknownProfile, 404],
        [ids.member, 409],
      ]) {
        const { response } = await send({
          recipientIds: [ids.recipient, recipient],
        });
        assert.equal(response.status, status);
        assert.equal(invitations.length, 0);
      }
    },
  );
  await t.test(
    "a pending invitation blocks the batch; declined history does not",
    async () => {
      invitations = [
        { trip: ids.trip, recipient: ids.recipient, status: "pending" },
      ];
      const before = inserts;
      const rejected = await send({
        recipientIds: [ids.recipient2, ids.recipient],
      });
      assert.equal(rejected.response.status, 409);
      assert.equal(inserts, before);
      assert.equal(invitations.length, 1);
      invitations[0].status = "declined";
      const accepted = await send({
        recipientIds: [ids.recipient, ids.recipient2],
      });
      assert.equal(accepted.response.status, 201);
      assert.equal(invitations.length, 3);
      invitations = [];
    },
  );
  await t.test(
    "write failures and racing duplicate keys abort the transaction",
    async () => {
      for (const code of [123, 11000]) {
        insertError = Object.assign(new Error("Insert failed"), { code });
        const { response } = await send({
          recipientIds: [ids.recipient, ids.recipient2],
        });
        assert.equal(response.status, code === 11000 ? 409 : 500);
        assert.equal(invitations.length, 0);
      }
      insertError = undefined;
    },
  );
  await t.test(
    "requires authentication, sharing permission, and an existing trip",
    async () => {
      for (const [user, status] of [
        [null, 401],
        [ids.viewer, 403],
        [ids.stranger, 403],
      ]) {
        assert.equal(
          (await send({ recipientIds: [ids.recipient] }, user)).response.status,
          status,
        );
      }
      assert.equal(
        (await send({ recipientIds: [ids.recipient] }, ids.owner, "invalid"))
          .response.status,
        400,
      );
      assert.equal(
        (
          await send(
            { recipientIds: [ids.recipient] },
            ids.owner,
            new mongoose.Types.ObjectId().toString(),
          )
        ).response.status,
        404,
      );
      assert.equal(invitations.length, 0);
    },
  );
});
