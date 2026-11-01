
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Trip = require('../models/trip');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const publicItineraryRoutes = require("../routes/publicItineraryRoutes");

test('public itinerary feed supports location search, pagination, and voting status', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'public-itinerary-search-secret';

  const originalMethods = {
    tripAggregate: Trip.aggregate,
    userFindById: User.findById,
    friendshipFind: Friendship.find,
  };

  const userId = new mongoose.Types.ObjectId().toString();
  const friendId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();

  const upvotedTripId = new mongoose.Types.ObjectId().toString();
  const downvotedTripId = new mongoose.Types.ObjectId().toString();

  let aggregatePipeline;
  let friendshipFilter;
  let aggregateRecords = [];

  // Mock the authenticated user.
  const user = {
    friends: [friendId],
    upvotedTrips: [new mongoose.Types.ObjectId(upvotedTripId)],
    downvotedTrips: [new mongoose.Types.ObjectId(downvotedTripId)],
  };

  User.findById = (id) => ({
    select: async (fields) => {
      assert.equal(
        fields,
        'friends upvotedTrips downvotedTrips',
      );

      return String(id) === userId ? user : null;
    },
  });

  // Mock accepted friendships.
  Friendship.find = async (filter) => {
    friendshipFilter = filter;

    return [
      {
        requester: userId,
        recipient: friendId,
      },
      {
        requester: otherUserId,
        recipient: userId,
      },
    ];
  };

  // Capture the MongoDB aggregation pipeline.
  Trip.aggregate = async (pipeline) => {
    aggregatePipeline = pipeline;
    return aggregateRecords;
  };

  // Express setup.
  const app = express();
  app.use(express.json());
  app.use("/api/itineraries", publicItineraryRoutes);

  const server = createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const token = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
  );

const FEED_PATH = '/api/itineraries/feed';

  // Sends an authenticated feed request.
  const sendFeedRequest = async (query = '', authenticated = true) => {
    const response = await fetch(
      `${baseUrl}${FEED_PATH}${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: authenticated
          ? { Authorization: `Bearer ${token}` }
          : {},
      },
    );

    const responseText = await response.text();

    return {
      response,
      data: responseText ? JSON.parse(responseText) : undefined,
    };
  };

  // Restore original methods after the test.
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));

    Trip.aggregate = originalMethods.tripAggregate;
    User.findById = originalMethods.userFindById;
    Friendship.find = originalMethods.friendshipFind;

    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  // --------------------------------------------------
  // 1. Reject requests without authentication.
  // --------------------------------------------------

  const unauthenticated = await sendFeedRequest('', false);

  assert.equal(unauthenticated.response.status, 401);

  // --------------------------------------------------
  // 2. Reject invalid pagination values.
  // --------------------------------------------------

  const invalidPage = await sendFeedRequest('page=-1');

  assert.equal(invalidPage.response.status, 400);
  assert.equal(
    invalidPage.data.message,
    'Invalid feed pagination',
  );

  const invalidLimit = await sendFeedRequest('limit=0');

  assert.equal(invalidLimit.response.status, 400);

  const decimalPage = await sendFeedRequest('page=1.5');

  assert.equal(decimalPage.response.status, 400);

  // --------------------------------------------------
  // 3. Search by location and verify aggregation.
  // --------------------------------------------------

  aggregateRecords = [
    {
      tripId: upvotedTripId,
      tripName: 'New York Vacation',
      tripStartDate: '2027-04-01',
      tripEndDate: '2027-04-05',
      isFriend: true,
      createdAt: new Date('2026-10-01'),
      votes: 15,
      owner: {
        id: friendId,
        username: 'friend',
        profile_picture: null,
      },
      itinerary: {
        _id: new mongoose.Types.ObjectId(),
        title: 'New York Trip',
        description: 'Exploring New York',
        startDate: '2027-04-01',
        endDate: '2027-04-05',
      },
    },
    {
      tripId: downvotedTripId,
      tripName: 'Another New York Trip',
      tripStartDate: '2027-05-01',
      tripEndDate: '2027-05-05',
      isFriend: false,
      createdAt: new Date('2026-09-01'),
      votes: 8,
      owner: {
        id: otherUserId,
        username: 'otheruser',
        profile_picture: null,
      },
      itinerary: {
        _id: new mongoose.Types.ObjectId(),
        title: 'City Exploration',
        description: 'Visiting the city',
        startDate: '2027-05-01',
        endDate: '2027-05-05',
      },
    },
    {
      tripId: new mongoose.Types.ObjectId().toString(),
      tripName: 'Third New York Trip',
      tripStartDate: '2027-06-01',
      tripEndDate: '2027-06-05',
      isFriend: false,
      createdAt: new Date('2026-08-01'),
      votes: 3,
      owner: {
        id: otherUserId,
        username: 'otheruser',
        profile_picture: null,
      },
      itinerary: {
        _id: new mongoose.Types.ObjectId(),
        title: 'Another Itinerary',
        description: '',
        startDate: '2027-06-01',
        endDate: '2027-06-05',
      },
    },
  ];

  const searchResponse = await sendFeedRequest(
    'location=New%20York&page=0&limit=2',
  );

  assert.equal(searchResponse.response.status, 200);

  // Only two records should be returned.
  assert.equal(searchResponse.data.items.length, 2);

  // A third record exists, so another page should be available.
  assert.equal(searchResponse.data.nextPage, 1);

  // Verify the location filter.
  const matchStage = aggregatePipeline.find(
    (stage) => stage.$match,
  );

  assert.ok(matchStage);

  assert.deepEqual(matchStage.$match, {
    isPublic: true,
    location: {
      $regex: 'New York',
      $options: 'i',
    },
  });

  // Verify pagination.
  const skipStage = aggregatePipeline.find(
    (stage) => stage.$skip !== undefined,
  );

  const limitStage = aggregatePipeline.find(
    (stage) => stage.$limit !== undefined,
  );

  assert.equal(skipStage.$skip, 0);
  assert.equal(limitStage.$limit, 3);

  // Verify accepted friendship lookup.
  assert.equal(friendshipFilter.status, 'accepted');
  assert.deepEqual(friendshipFilter.$or, [
    { requester: userId },
    { recipient: userId },
  ]);

  // --------------------------------------------------
  // 4. Verify voting information is returned.
  // --------------------------------------------------

  const upvotedItem = searchResponse.data.items.find(
    (item) => String(item.tripId) === upvotedTripId,
  );

  assert.ok(upvotedItem);
  assert.equal(upvotedItem.hasUpvoted, true);
  assert.equal(upvotedItem.hasDownvoted, false);

  const downvotedItem = searchResponse.data.items.find(
    (item) => String(item.tripId) === downvotedTripId,
  );

  assert.ok(downvotedItem);
  assert.equal(downvotedItem.hasUpvoted, false);
  assert.equal(downvotedItem.hasDownvoted, true);

  // --------------------------------------------------
  // 5. Verify page two pagination.
  // --------------------------------------------------

  const secondPage = await sendFeedRequest(
    'location=New%20York&page=1&limit=2',
  );

  assert.equal(secondPage.response.status, 200);

  assert.equal(
    aggregatePipeline.find((stage) => stage.$skip !== undefined).$skip,
    2,
  );

  assert.equal(
    aggregatePipeline.find((stage) => stage.$limit !== undefined).$limit,
    3,
  );

  // --------------------------------------------------
  // 6. Verify page size is capped at MAX_PAGE_SIZE (20).
  // --------------------------------------------------

  aggregateRecords = [];

  const cappedPage = await sendFeedRequest('page=1&limit=50');

  assert.equal(cappedPage.response.status, 200);

  assert.equal(
    aggregatePipeline.find((stage) => stage.$skip !== undefined).$skip,
    20,
  );

  assert.equal(
    aggregatePipeline.find((stage) => stage.$limit !== undefined).$limit,
    21,
  );

  // --------------------------------------------------
  // 7. Verify special regex characters are escaped.
  // --------------------------------------------------

  await sendFeedRequest('location=New%20York%20(Manhattan)');

  const escapedMatch = aggregatePipeline.find(
    (stage) => stage.$match,
  );

  assert.deepEqual(escapedMatch.$match.location, {
    $regex: 'New York \\(Manhattan\\)',
    $options: 'i',
  });

  // --------------------------------------------------
  // 8. Verify an empty result returns no next page.
  // --------------------------------------------------

  aggregateRecords = [];

  const emptySearch = await sendFeedRequest('location=Unknown');

  assert.equal(emptySearch.response.status, 200);
  assert.deepEqual(emptySearch.data.items, []);
  assert.equal(emptySearch.data.nextPage, null);
});
