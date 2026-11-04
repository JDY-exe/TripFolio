const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const ArchivedItineraryNote = require("../models/ArchivedItineraryNote");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const itineraryRoutes = require("../routes/itineraryRoutes");

test("archived itinerary notes are unique per author and itinerary", () => {
  assert.ok(
    ArchivedItineraryNote.schema
      .indexes()
      .some(
        ([fields, options]) =>
          fields.itineraryId === 1 &&
          fields.authorId === 1 &&
          options.unique === true,
      ),
  );
});

test("archived itinerary notes can only be read and edited by their author", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "archived-itinerary-notes-test-secret";

  const originalTripFindById = Trip.findById;
  const originalItineraryFindOne = Itinerary.findOne;
  const originalNoteFindOne = ArchivedItineraryNote.findOne;
  const originalNoteCreate = ArchivedItineraryNote.create;
  const originalNoteFindOneAndUpdate = ArchivedItineraryNote.findOneAndUpdate;

  const ownerId = new mongoose.Types.ObjectId().toString();
  const viewerId = new mongoose.Types.ObjectId().toString();
  const strangerId = new mongoose.Types.ObjectId().toString();
  const tripId = new mongoose.Types.ObjectId().toString();
  const activeTripId = new mongoose.Types.ObjectId().toString();
  const itineraryId = new mongoose.Types.ObjectId().toString();
  const activeItineraryId = new mongoose.Types.ObjectId().toString();
  const notes = new Map();
  const trip = {
    _id: new mongoose.Types.ObjectId(tripId),
    ownerId,
    users: [ownerId, viewerId],
    viewerIds: [viewerId],
    memberRoles: new Map([[viewerId, "viewer"]]),
    archived: true,
  };
  const activeTrip = {
    ...trip,
    _id: new mongoose.Types.ObjectId(activeTripId),
    archived: false,
  };
  const itineraries = new Map([
    [
      tripId,
      {
        _id: new mongoose.Types.ObjectId(itineraryId),
        tripId,
        description: "Shared itinerary description",
      },
    ],
    [
      activeTripId,
      {
        _id: new mongoose.Types.ObjectId(activeItineraryId),
        tripId: activeTripId,
      },
    ],
  ]);
  const noteKey = ({
    itineraryId: requestedItineraryId,
    authorId: requestedAuthorId,
  }) => `${requestedItineraryId}:${requestedAuthorId}`;

  Trip.findById = async (id) =>
    String(id) === tripId
      ? trip
      : String(id) === activeTripId
        ? activeTrip
        : null;
  Itinerary.findOne = async ({ tripId: requestedTripId }) =>
    itineraries.get(String(requestedTripId)) ?? null;
  ArchivedItineraryNote.findOne = async (filter) =>
    notes.get(noteKey(filter)) ?? null;
  ArchivedItineraryNote.create = async (fields) => {
    const key = noteKey(fields);
    if (notes.has(key)) {
      const error = new Error("Duplicate note");
      error.code = 11000;
      throw error;
    }
    const note = { _id: new mongoose.Types.ObjectId(), ...fields };
    notes.set(key, note);
    return note;
  };
  ArchivedItineraryNote.findOneAndUpdate = async (filter, update) => {
    const note = notes.get(noteKey(filter));
    if (!note) return null;
    Object.assign(note, update);
    return note;
  };

  const app = express();
  app.use(express.json());
  app.use("/itinerary", itineraryRoutes);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const tokenFor = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET);
  const send = async (path, { method = "GET", userId, body } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${tokenFor(userId)}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    return { response, data: text ? JSON.parse(text) : null };
  };

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    Trip.findById = originalTripFindById;
    Itinerary.findOne = originalItineraryFindOne;
    ArchivedItineraryNote.findOne = originalNoteFindOne;
    ArchivedItineraryNote.create = originalNoteCreate;
    ArchivedItineraryNote.findOneAndUpdate = originalNoteFindOneAndUpdate;
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  const path = `/itinerary/${tripId}/notes`;
  const unauthenticatedResponse = await fetch(`${baseUrl}${path}`);
  assert.equal(unauthenticatedResponse.status, 401);

  const invalidCreateBody = await send(path, {
    method: "POST",
    userId: ownerId,
    body: { content: 42 },
  });
  assert.equal(invalidCreateBody.response.status, 400);
  const emptyCreateBody = await send(path, {
    method: "POST",
    userId: ownerId,
    body: { content: "  " },
  });
  assert.equal(emptyCreateBody.response.status, 400);

  const updateBeforeCreate = await send(path, {
    method: "PATCH",
    userId: viewerId,
    body: { content: "No existing note" },
  });
  assert.equal(updateBeforeCreate.response.status, 404);

  const emptyViewerNote = await send(path, { userId: viewerId });
  assert.equal(emptyViewerNote.response.status, 200);
  assert.equal(emptyViewerNote.data, null);

  const createdViewerNote = await send(path, {
    method: "POST",
    userId: viewerId,
    body: { content: "My private memory" },
  });
  assert.equal(createdViewerNote.response.status, 201);
  assert.equal(createdViewerNote.data.content, "My private memory");
  assert.equal(
    itineraries.get(tripId).description,
    "Shared itinerary description",
  );

  const ownerCannotReadViewerNote = await send(path, { userId: ownerId });
  assert.equal(ownerCannotReadViewerNote.response.status, 200);
  assert.equal(ownerCannotReadViewerNote.data, null);
  const ownerCannotEditViewerNote = await send(path, {
    method: "PATCH",
    userId: ownerId,
    body: { content: "Attempted edit" },
  });
  assert.equal(ownerCannotEditViewerNote.response.status, 404);

  const updatedViewerNote = await send(path, {
    method: "PATCH",
    userId: viewerId,
    body: { content: "Updated private memory" },
  });
  assert.equal(updatedViewerNote.response.status, 200);
  assert.equal(updatedViewerNote.data.content, "Updated private memory");
  const clearedViewerNote = await send(path, {
    method: "PATCH",
    userId: viewerId,
    body: { content: "" },
  });
  assert.equal(clearedViewerNote.response.status, 200);
  assert.equal(clearedViewerNote.data.content, "");

  const ownerNote = await send(path, {
    method: "POST",
    userId: ownerId,
    body: { content: "Owner-only memory" },
  });
  assert.equal(ownerNote.response.status, 201);
  assert.equal(notes.size, 2);

  const duplicateNote = await send(path, {
    method: "POST",
    userId: viewerId,
    body: { content: "Duplicate" },
  });
  assert.equal(duplicateNote.response.status, 409);

  const strangerRead = await send(path, { userId: strangerId });
  assert.equal(strangerRead.response.status, 404);
  const activeTripWrite = await send(`/itinerary/${activeTripId}/notes`, {
    method: "POST",
    userId: ownerId,
    body: { content: "Not archived" },
  });
  assert.equal(activeTripWrite.response.status, 404);
  const invalidTripId = await send("/itinerary/not-an-id/notes", {
    userId: ownerId,
  });
  assert.equal(invalidTripId.response.status, 400);
});
