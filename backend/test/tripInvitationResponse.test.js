const assert = require("node:assert/strict");
const test = require("node:test");
const Trip = require("../models/trip");
const Invitation = require("../models/TripInvitation");
const {
  acceptTripInvitation,
  respondToTripInvitation
} = require("../controllers/tripController");

test("invitation responses apply the invited role and require a pending invitation owned by the recipient", async () => {
  const originalFind = Invitation.findOne;
  const originalTripFind = Trip.findById;
  const originalUpdate = Trip.findByIdAndUpdate;
  const updates = [];
  let pending = true;
  const trip = { _id: "trip-id", ownerId: "owner", users: ["owner"] };
  const invitation = { trip: "trip-id", role: "viewer", save: async () => {} };
  Trip.findById = async () => trip;
  Invitation.findOne = async (filter) => {
    assert.equal(filter.recipient, "recipient");
    assert.equal(filter.status, "pending");
    return pending ? invitation : null;
  };
  Trip.findByIdAndUpdate = async (...args) => {
    updates.push(args);
    return {};
  };
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

    trip.users.push("recipient");
    trip.memberRoles = { recipient: "viewer" };
    invitation.role = "editor";
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
    Trip.findByIdAndUpdate = originalUpdate;
  }
});
