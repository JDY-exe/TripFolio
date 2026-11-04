const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const { reset, restore, readBackup } = require("../scripts/resetPlanningData");
const { EJSON, ObjectId } = mongoose.mongo.BSON;
const clone = (value) =>
  EJSON.parse(EJSON.stringify(value, { relaxed: false }), { relaxed: true });

/** Small raw-collection harness; transaction failures roll back staged BSON data. */
const createHarness = (t) => {
  const eventId = new ObjectId();
  const reservationId = new ObjectId();
  const state = {
    events: [
      {
        _id: eventId,
        title: "Original",
        startTime: new Date("2027-04-01T15:00:00Z"),
      },
    ],
    reservations: [{ _id: reservationId, notes: "Booking notes" }],
    trips: [
      {
        _id: new ObjectId(),
        name: "Keep this trip",
        reservations: [reservationId],
      },
      { _id: new ObjectId(), name: "No reference field" },
    ],
    photos: [
      {
        _id: new ObjectId(),
        linkedEvent: eventId,
        originalName: "Keep.webp",
        fileId: new ObjectId(),
      },
      { _id: new ObjectId(), linkedEvent: null },
    ],
  };
  const matches = (document, filter) =>
    Object.entries(filter).every(([key, expected]) => {
      const value = key
        .split(".")
        .reduce((current, field) => current?.[field], document);
      if (expected && Object.hasOwn(expected, "$ne")) return value != null;
      if (expected && Object.hasOwn(expected, "$exists"))
        return (value !== undefined) === expected.$exists;
      return EJSON.stringify(value) === EJSON.stringify(expected);
    });
  const select = (document, options) =>
    options?.projection
      ? Object.fromEntries(
          Object.keys(options.projection)
            .filter((key) => Object.hasOwn(document, key))
            .map((key) => [key, clone(document[key])]),
        )
      : clone(document);
  let failInsert = false;
  const db = {
    collection: (name) => ({
      find: (filter, options) => ({
        toArray: async () =>
          state[name]
            .filter((doc) => matches(doc, filter))
            .map((doc) => select(doc, options)),
      }),
      findOne: async (filter, options) => {
        const doc = state[name].find((doc) => matches(doc, filter));
        return doc ? select(doc, options) : null;
      },
      countDocuments: async (filter = {}) =>
        state[name].filter((doc) => matches(doc, filter)).length,
      deleteMany: async (filter) => {
        const before = state[name].length;
        state[name] = state[name].filter((doc) => !matches(doc, filter));
        return { deletedCount: before - state[name].length };
      },
      updateOne: async (filter, update) =>
        updateDocuments(name, filter, update, true),
      updateMany: async (filter, update) =>
        updateDocuments(name, filter, update, false),
      insertMany: async (docs) => {
        if (failInsert) throw new Error("Injected restore write failure");
        state[name].push(...clone(docs));
      },
    }),
  };
  const updateDocuments = (name, filter, update, single) => {
    const docs = state[name]
      .filter((doc) => matches(doc, filter))
      .slice(0, single ? 1 : undefined);
    for (const doc of docs) {
      Object.assign(doc, clone(update.$set || {}));
      for (const key of Object.keys(update.$unset || {})) delete doc[key];
    }
    return { matchedCount: docs.length, modifiedCount: docs.length };
  };
  t.mock.method(mongoose.connection, "transaction", async (operation) => {
    const before = clone(state);
    try {
      return await operation({});
    } catch (error) {
      Object.assign(state, before);
      throw error;
    }
  });
  return {
    db,
    state,
    failInsert: (value) => {
      failInsert = value;
    },
  };
};

test("planning reset and restore preserve photos and unrelated trip fields, and reject unsafe restores", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tripfolio-restore-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const target = { database: "isolated", server: "test.example" };
  const { db, state, failInsert } = createHarness(t);
  const before = clone(state);
  await reset(db, target, root);
  const directory = path.join(root, (await fs.readdir(root))[0]);
  const { snapshot } = await readBackup(directory);
  assert.equal(snapshot.photoReferences.length, 1);
  assert.deepEqual(state.events, []);
  assert.deepEqual(state.reservations, []);
  assert.deepEqual(state.trips[0].reservations, []);
  assert.equal(Object.hasOwn(state.trips[1], "reservations"), false);
  assert.equal(state.photos.length, 2);
  assert.equal(state.photos[0].linkedEvent, null);
  assert.equal(
    state.photos[0].fileId.toHexString(),
    before.photos[0].fileId.toHexString(),
  );
  state.trips[0].name = "Edited after reset";
  await assert.rejects(
    restore(db, { ...target, database: "other" }, directory),
    /different database/,
  );
  state.photos[0].linkedEvent = new ObjectId();
  await assert.rejects(restore(db, target, directory), /new event link/);
  state.photos[0].linkedEvent = null;
  state.reservations.push({ _id: new ObjectId() });
  await assert.rejects(restore(db, target, directory), /new planning data/);
  state.reservations = [];
  failInsert(true);
  await assert.rejects(restore(db, target, directory), /Injected restore/);
  assert.deepEqual(state.events, []);
  assert.equal(state.photos[0].linkedEvent, null);
  failInsert(false);
  await restore(db, target, directory);
  assert.deepEqual(state.events, before.events);
  assert.deepEqual(state.reservations, before.reservations);
  assert.deepEqual(state.photos, before.photos);
  assert.deepEqual(state.trips[0].reservations, before.trips[0].reservations);
  assert.equal(state.trips[0].name, "Edited after reset");
  assert.equal(Object.hasOwn(state.trips[1], "reservations"), false);
});
