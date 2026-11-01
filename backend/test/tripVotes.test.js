
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Trip = require('../models/trip');
const User = require('../models/User');
const tripRoutes = require('../routes/tripRoutes');

test('trip voting supports upvotes, downvotes, toggling, and switching', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'trip-votes-integration-secret';

  const originalMethods = {
    tripFindById: Trip.findById,
    tripSave: Trip.prototype.save,
    userFindById: User.findById,
  };

  const trips = new Map();

  const userId = new mongoose.Types.ObjectId().toString();
  const tripId = new mongoose.Types.ObjectId().toString();

  // Creates arrays that support the Mongoose methods used by the controller.
  const createVoteList = () => {
    const list = [];

    list.pull = function pull(id) {
      const index = this.findIndex((entry) => entry.equals(id));
      if (index !== -1) {
        this.splice(index, 1);
      }
    };

    list.addToSet = function addToSet(id) {
      if (!this.some((entry) => entry.equals(id))) {
        this.push(new mongoose.Types.ObjectId(id));
      }
    };

    return list;
  };

  // Mock user with voting information.
  const user = {
    upvotedTrips: createVoteList(),
    downvotedTrips: createVoteList(),

    save: async function save() {
      return this;
    },
  };

  // Mock trip stored in memory.
  const trip = {
    _id: new mongoose.Types.ObjectId(tripId),
    votes: 0,

    save: async function save() {
      trips.set(String(this._id), this);
      return this;
    },
  };

  trips.set(tripId, trip);

  // Mock database lookups.
  Trip.findById = async (id) => trips.get(String(id)) || null;

  Trip.prototype.save = async function saveTrip() {
    trips.set(String(this._id), this);
    return this;
  };

  User.findById = async (id) => (
    String(id) === userId ? user : null
  );

  // Set up Express application.
  const app = express();
  app.use(express.json());
  app.use('/trip', tripRoutes);

  const server = createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const token = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
  );

  // Sends an authenticated voting request.
  const sendVote = async (isUpvote, targetTripId = tripId) => {
    const response = await fetch(`${baseUrl}/trip/votes`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: targetTripId,
        isUpvote,
      }),
    });

    const responseText = await response.text();

    return {
      response,
      data: responseText ? JSON.parse(responseText) : undefined,
    };
  };

  // Restore everything after the test finishes.
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));

    Trip.findById = originalMethods.tripFindById;
    Trip.prototype.save = originalMethods.tripSave;
    User.findById = originalMethods.userFindById;

    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  // 1. Reject invalid vote values.
  const invalidVote = await sendVote('true');

  assert.equal(invalidVote.response.status, 400);

  // 2. First upvote.
  const firstUpvote = await sendVote(true);

  assert.equal(firstUpvote.response.status, 200);
  assert.equal(firstUpvote.data.trip.votes, 1);
  assert.equal(firstUpvote.data.hasUpvoted, true);
  assert.equal(firstUpvote.data.hasDownvoted, false);

  // 3. Toggle existing upvote off.
  const removeUpvote = await sendVote(true);

  assert.equal(removeUpvote.response.status, 200);
  assert.equal(removeUpvote.data.trip.votes, 0);
  assert.equal(removeUpvote.data.hasUpvoted, false);
  assert.equal(removeUpvote.data.hasDownvoted, false);

  // 4. First downvote.
  const firstDownvote = await sendVote(false);

  assert.equal(firstDownvote.response.status, 200);
  assert.equal(firstDownvote.data.trip.votes, -1);
  assert.equal(firstDownvote.data.hasUpvoted, false);
  assert.equal(firstDownvote.data.hasDownvoted, true);

  // 5. Toggle existing downvote off.
  const removeDownvote = await sendVote(false);

  assert.equal(removeDownvote.response.status, 200);
  assert.equal(removeDownvote.data.trip.votes, 0);
  assert.equal(removeDownvote.data.hasUpvoted, false);
  assert.equal(removeDownvote.data.hasDownvoted, false);

  // 6. Switch from downvote to upvote.
  await sendVote(false);

  const changeToUpvote = await sendVote(true);

  assert.equal(changeToUpvote.response.status, 200);
  assert.equal(changeToUpvote.data.trip.votes, 1);
  assert.equal(changeToUpvote.data.hasUpvoted, true);
  assert.equal(changeToUpvote.data.hasDownvoted, false);

  // 7. Switch from upvote to downvote.
  const changeToDownvote = await sendVote(false);

  assert.equal(changeToDownvote.response.status, 200);
  assert.equal(changeToDownvote.data.trip.votes, -1);
  assert.equal(changeToDownvote.data.hasUpvoted, false);
  assert.equal(changeToDownvote.data.hasDownvoted, true);

  // 8. Return 404 when voting on a nonexistent trip.
  const missingTrip = await sendVote(
    true,
    new mongoose.Types.ObjectId().toString(),
  );

  assert.equal(missingTrip.response.status, 404);
});
