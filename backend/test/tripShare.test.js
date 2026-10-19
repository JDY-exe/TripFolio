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

test("POST /trip/:id/share authorizes and creates invitations for profiles", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "trip-share-test-secret";

  const originalMethods = {
    tripFindById: Trip.findById,
    userFindById: User.findById,
    invitationFindOne: TripInvitation.findOne,
    invitationSave: TripInvitation.prototype.save,
  };
  const ids = {
    trip: new mongoose.Types.ObjectId().toString(),
    owner: new mongoose.Types.ObjectId().toString(),
    editor: new mongoose.Types.ObjectId().toString(),
    viewer: new mongoose.Types.ObjectId().toString(),
    stranger: new mongoose.Types.ObjectId().toString(),
    recipient: new mongoose.Types.ObjectId().toString(),
    member: new mongoose.Types.ObjectId().toString(),
    recipient2: new mongoose.Types.ObjectId().toString(),
    unknownProfile: new mongoose.Types.ObjectId().toString(),
  };
  const trips = new Map([
    [
      ids.trip,
      {
        _id: ids.trip,
        ownerId: ids.owner,
        users: [ids.owner, ids.editor, ids.viewer, ids.member],
        viewerIds: [ids.viewer],
      },
    ],
  ]);
  const profiles = new Set([
    ids.owner,
    ids.editor,
    ids.viewer,
    ids.stranger,
    ids.recipient,
    ids.recipient2,
    ids.member,
  ]);
  const invitations = [];

  Trip.findById = async (tripId) => trips.get(String(tripId)) ?? null;
  User.findById = async (userId) =>
    profiles.has(String(userId)) ? { _id: userId } : null;
  TripInvitation.findOne = async ({ trip, recipient, status }) =>
    invitations.find(
      (invitation) =>
        String(invitation.trip) === String(trip) &&
        String(invitation.recipient) === String(recipient) &&
        invitation.status === status,
    ) ?? null;
  TripInvitation.prototype.save = async function saveInvitation() {
    invitations.push(this);
    return this;
  };

  const app = express();
  app.use(express.json());
  app.use("/trip", tripRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const tokenFor = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET);
  const send = async (tripId, userId, body) => {
    const response = await fetch(`${baseUrl}/trip/${tripId}/share`, {
      method: "POST",
      headers: {
        ...(userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {}),
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      response,
      data: await response.json(),
    };
  };

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Trip.findById = originalMethods.tripFindById;
    User.findById = originalMethods.userFindById;
    TripInvitation.findOne = originalMethods.invitationFindOne;
    TripInvitation.prototype.save = originalMethods.invitationSave;
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  await t.test("owners and editors can invite existing profiles", async () => {
    for (const [inviterId, recipientId] of [
      [ids.owner, ids.recipient],
      [ids.editor, ids.recipient2],
    ]) {
      const { response, data } = await send(ids.trip, inviterId, {
        recipientId,
      });
      assert.equal(response.status, 201);
      assert.equal(String(data.invitation.trip), ids.trip);
      assert.equal(String(data.invitation.recipient), recipientId);
      assert.equal(String(data.invitation.inviter), inviterId);
      assert.equal(data.invitation.status, "pending");
    }
  });

  await t.test("viewers and non-members cannot share a trip", async () => {
    for (const inviterId of [ids.viewer, ids.stranger]) {
      const { response } = await send(ids.trip, inviterId, {
        recipientId: new mongoose.Types.ObjectId().toString(),
      });
      assert.equal(response.status, 403);
    }
  });

  await t.test(
    "rejects missing recipient profiles and invalid recipient IDs",
    async () => {
      const unknownProfile = await send(ids.trip, ids.owner, {
        recipientId: ids.unknownProfile,
      });
      assert.equal(unknownProfile.response.status, 404);

      const invalidId = await send(ids.trip, ids.owner, {
        recipientId: "not-an-object-id",
      });
      assert.equal(invalidId.response.status, 400);
    },
  );

  await t.test(
    "rejects trip members and duplicate pending invitations",
    async () => {
      const memberInvite = await send(ids.trip, ids.owner, {
        recipientId: ids.member,
      });
      assert.equal(memberInvite.response.status, 409);

      const duplicateInvite = await send(ids.trip, ids.owner, {
        recipientId: ids.recipient,
      });
      assert.equal(duplicateInvite.response.status, 409);
    },
  );

  await t.test("requires authentication", async () => {
    const { response } = await send(ids.trip, undefined, {
      recipientId: ids.recipient,
    });
    assert.equal(response.status, 401);
  });
});
