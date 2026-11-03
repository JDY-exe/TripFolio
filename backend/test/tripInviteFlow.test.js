const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const TripInvitation = require("../models/TripInvitation");
const tripRoutes = require("../routes/tripRoutes");
const userRoutes = require("../routes/userRoutes");

test("trip invitation list and accept/reject flows work for recipients", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "invite-flow-secret";

  const originalMethods = {
    tripFind: Trip.find,
    tripFindById: Trip.findById,
    userFind: require("../models/User").find,
    userFindById: require("../models/User").findById,
    tripInvitationFind: TripInvitation.find,
    tripInvitationFindOne: TripInvitation.findOne,
    tripInvitationPrototypeSave: TripInvitation.prototype.save,
  };

  const tripId = new mongoose.Types.ObjectId().toString();
  const ownerId = new mongoose.Types.ObjectId().toString();
  const inviterId = new mongoose.Types.ObjectId().toString();
  const recipientId = new mongoose.Types.ObjectId().toString();

  const trip = {
    _id: tripId,
    ownerId,
    users: [ownerId],
    viewerIds: [recipientId],
    name: "Invite Test Trip",
    startDate: "2026-05-01",
    endDate: "2026-05-05",
    save: async function saveTrip() {
      return this;
    },
  };

  const invite = {
    _id: new mongoose.Types.ObjectId().toString(),
    trip: tripId,
    recipient: recipientId,
    inviter: inviterId,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    tripRecord: {
      _id: tripId,
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
    },
    inviterRecord: {
      _id: inviterId,
      username: "invite-user",
      profile_picture: null,
    },
    populate: function populate() {
      return this;
    },
    save: async function saveInvite() {
      return this;
    },
  };

  const User = require("../models/User");
  Trip.find = () => ({
    select: () => ({
      lean: async () => [{
        _id: tripId,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
      }],
    }),
  });
  Trip.findById = async (id) => (String(id) === tripId ? trip : null);
  User.find = () => ({
    select: () => ({
      lean: async () => [{
        _id: inviterId,
        username: invite.inviterRecord.username,
        profile_picture: invite.inviterRecord.profile_picture,
      }],
    }),
  });
  User.findById = () => ({
    select: () => ({
      lean: async () => ({
        _id: inviterId,
        username: invite.inviterRecord.username,
        profile_picture: invite.inviterRecord.profile_picture,
      }),
    }),
  });
  TripInvitation.find = () => ({
    sort: () => [{
      _id: invite._id,
      status: invite.status,
      createdAt: invite.createdAt,
      trip: invite.tripRecord._id,
      inviter: invite.inviterRecord._id,
    }],
  });
  TripInvitation.findOne = async ({ status } = {}) => {
    if (status === "pending" && invite.status === "pending") {
      return invite;
    }
    return null;
  };
  TripInvitation.prototype.save = async function saveInvitation() {
    return this;
  };

  const app = express();
  app.use(express.json());
  app.use("/trip", tripRoutes);
  app.use("/user", userRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Trip.find = originalMethods.tripFind;
    Trip.findById = originalMethods.tripFindById;
    const User = require("../models/User");
    User.find = originalMethods.userFind;
    User.findById = originalMethods.userFindById;
    TripInvitation.find = originalMethods.tripInvitationFind;
    TripInvitation.findOne = originalMethods.tripInvitationFindOne;
    TripInvitation.prototype.save = originalMethods.tripInvitationPrototypeSave;
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  const token = jwt.sign({ id: recipientId }, process.env.JWT_SECRET);

  const listResponse = await fetch(`${baseUrl}/user/invites`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  assert.equal(listResponse.status, 200);
  const inviteList = await listResponse.json();
  assert.equal(inviteList.invites.length, 1);
  assert.equal(inviteList.invites[0].trip.name, "Invite Test Trip");
  assert.equal(inviteList.invites[0].inviter.username, "invite-user");

  const acceptResponse = await fetch(`${baseUrl}/trip/${tripId}/invites/accept`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  assert.equal(acceptResponse.status, 200);
  const acceptData = await acceptResponse.json();
  assert.equal(acceptData.invitation.status, "accepted");
  assert.equal(acceptData.message, "You are already a member of this trip.");
  assert.equal(trip.users.length, 1);

  const rejectResponse = await fetch(`${baseUrl}/trip/${tripId}/invites/reject`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  assert.equal(rejectResponse.status, 404);
});
