const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const TripInvitation = require("../models/TripInvitation");

test("trip invitations require trip, existing-profile recipient, and inviter", async () => {
  const invitation = new TripInvitation({});

  await assert.rejects(
    invitation.validate(),
    (error) => {
      assert.deepEqual(
        Object.keys(error.errors).sort(),
        ["inviter", "recipient", "trip"]
      );
      return true;
    }
  );
  assert.equal(invitation.status, "pending");
});

test("trip invitations accept only pending, accepted, or declined statuses", async () => {
  const invitation = new TripInvitation({
    trip: new mongoose.Types.ObjectId(),
    recipient: new mongoose.Types.ObjectId(),
    inviter: new mongoose.Types.ObjectId(),
    status: "sent"
  });

  await assert.rejects(
    invitation.validate(),
    (error) => error.errors.status.kind === "enum"
  );
});

test("trip invitations prevent duplicate pending recipients per trip", () => {
  const pendingIndex = TripInvitation.schema.indexes().find(
    ([fields, options]) =>
      fields.trip === 1 &&
      fields.recipient === 1 &&
      options.unique &&
      options.partialFilterExpression?.status === "pending"
  );

  assert.ok(pendingIndex);
});
