const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const Invitation = require("../models/TripInvitation");
const {
  acceptTripInvitation,
  respondToTripInvitation
} = require("../controllers/tripController");

test("invitation responses apply the invited role and require a pending invitation owned by the recipient", async () => {
  const originalFind = Invitation.findOne;
  const originalTripFind = Trip.findById;
  const originalUpdate = Trip.findOneAndUpdate;
  const originalTripUpdate = Trip.updateOne;
  const originalTransaction = mongoose.connection.transaction;
  const updates = [];
  let archivedShares = [];
  const session = {};
  let pending = true;
  const trip = {
    _id: "trip-id",
    ownerId: "owner",
    users: ["owner"],
    archived: false
  };
  const invitation = {
    _id: "invitation-id",
    trip: "trip-id",
    role: "viewer",
    archivedReadOnly: false,
    save: async () => {}
  };
  Trip.findById = () => ({
    then: (resolve, reject) => Promise.resolve(trip).then(resolve, reject),
    session: async (currentSession) => {
      assert.equal(currentSession, session);
      return trip;
    }
  });
  Invitation.findOne = (filter) => {
    if (filter.archivedReadOnly) {
      return {
        session: async (currentSession) => {
          assert.equal(currentSession, session);
          return pending ? invitation : null;
        }
      };
    }
    assert.equal(filter.recipient, "recipient");
    assert.equal(filter.status, "pending");
    return Promise.resolve(pending ? invitation : null);
  };
  Trip.findOneAndUpdate = async (...args) => {
    updates.push(args);
    return {};
  };
  Trip.updateOne = async (filter, update, options) => {
    assert.equal(options.session, session);
    if (filter.archived !== true || !trip.archived) {
      return { matchedCount: 0 };
    }
    const recipientId = update.$addToSet.archivedSharedWith;
    if (!archivedShares.includes(recipientId)) archivedShares.push(recipientId);
    return { matchedCount: 1 };
  };
  mongoose.connection.transaction = async (callback) => callback(session);
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  const request = (status) => ({
    user: { id: "recipient" },
    params: { invitationId: "507f1f77bcf86cd799439011" },
    body: { status }
  });

  try {
    await respondToTripInvitation(request("accepted"), res);
    assert.equal(res.code, 200);
    assert.deepEqual(updates[0][1], {
      $addToSet: { users: "recipient", viewerIds: "recipient" },
      $set: { "memberRoles.recipient": "viewer" }
    });
    assert.equal(invitation.status, "accepted");

    trip.archived = true;
    invitation.status = "pending";
    await respondToTripInvitation(request("accepted"), res);
    assert.equal(res.code, 409);
    assert.equal(invitation.status, "pending");
    assert.equal(updates.length, 1);
    await acceptTripInvitation(
      {
        user: { id: "recipient" },
        params: { id: "507f1f77bcf86cd799439011" }
      },
      res
    );
    assert.equal(res.code, 409);
    assert.equal(invitation.status, "pending");
    assert.equal(updates.length, 1);
    trip.archived = false;

    invitation.role = "editor";
    invitation.status = "pending";
    await respondToTripInvitation(request("accepted"), res);
    assert.deepEqual(updates[1][1], {
      $addToSet: { users: "recipient" },
      $set: { "memberRoles.recipient": "editor" },
      $pull: { viewerIds: "recipient" }
    });

    invitation.status = "pending";
    await acceptTripInvitation(
      {
        user: { id: "recipient" },
        params: { id: "507f1f77bcf86cd799439011" }
      },
      res
    );
    assert.deepEqual(updates[2][1], updates[1][1]);

    await respondToTripInvitation(request("declined"), res);
    assert.equal(invitation.status, "declined");
    assert.equal(updates.length, 3);

    trip.archived = true;
    invitation.archivedReadOnly = true;
    invitation.status = "pending";
    invitation.save = async ({ session: currentSession } = {}) => {
      assert.equal(currentSession, session);
    };
    assert.deepEqual(archivedShares, []);
    trip.archived = false;
    await respondToTripInvitation(request("accepted"), res);
    assert.equal(res.code, 409);
    assert.deepEqual(archivedShares, []);
    trip.archived = true;
    await respondToTripInvitation(request("accepted"), res);
    assert.equal(res.code, 200);
    assert.equal(invitation.status, "accepted");
    assert.deepEqual(archivedShares, ["recipient"]);
    assert.deepEqual(trip.users, ["owner"]);
    assert.equal(updates.length, 3);

    trip.archived = false;
    trip.users.push("recipient");
    trip.memberRoles = { recipient: "viewer" };
    invitation.role = "editor";
    invitation.archivedReadOnly = false;
    invitation.save = async () => {};
    invitation.status = "pending";
    await respondToTripInvitation(request("accepted"), res);
    assert.equal(res.body.message, "You are already a member of this trip.");
    assert.equal(updates.length, 3);

    pending = false;
    await respondToTripInvitation(request("accepted"), res);
    assert.equal(res.code, 404);
    await respondToTripInvitation(request("pending"), res);
    assert.equal(res.code, 400);
  } finally {
    Invitation.findOne = originalFind;
    Trip.findById = originalTripFind;
    Trip.findOneAndUpdate = originalUpdate;
    Trip.updateOne = originalTripUpdate;
    mongoose.connection.transaction = originalTransaction;
  }
});
