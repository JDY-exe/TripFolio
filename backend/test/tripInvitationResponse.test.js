const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const Invitation = require("../models/TripInvitation");
const { respondToTripInvitation } = require("../controllers/tripController");

test("invitation responses require a pending invitation owned by the recipient and version membership additions", async (t) => {
  const originals = [
    Invitation.findOne,
    Trip.findById,
    Trip.updateOne,
    mongoose.connection.transaction,
  ];
  t.after(() => {
    [
      Invitation.findOne,
      Trip.findById,
      Trip.updateOne,
      mongoose.connection.transaction,
    ] = originals;
  });
  const updates = [];
  let pending = true;
  const invitation = {
    _id: "invitation",
    trip: "trip-id",
    save: async () => {},
  };
  Invitation.findOne = (filter) => {
    assert.equal(filter.recipient, "recipient");
    assert.equal(filter.status, "pending");
    const result = pending ? invitation : null;
    return Object.assign(Promise.resolve(result), {
      session: async () => result,
    });
  };
  Trip.findById = async () => ({ _id: "trip-id", users: [] });
  Trip.updateOne = async (...args) => {
    updates.push(args);
    return {};
  };
  mongoose.connection.transaction = async (action) => action({});
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const request = (status) => ({
    user: { id: "recipient" },
    params: { invitationId: "507f1f77bcf86cd799439011" },
    body: { status },
  });
  await respondToTripInvitation(request("accepted"), res);
  assert.equal(res.code, 200);
  assert.deepEqual(updates[0][1], {
    $addToSet: { users: "recipient" },
    $inc: { version: 1 },
  });
  assert.equal(invitation.status, "accepted");
  await respondToTripInvitation(request("declined"), res);
  assert.equal(invitation.status, "declined");
  assert.equal(updates.length, 1);
  pending = false;
  await respondToTripInvitation(request("accepted"), res);
  assert.equal(res.code, 404);
  await respondToTripInvitation(request("pending"), res);
  assert.equal(res.code, 400);
});
