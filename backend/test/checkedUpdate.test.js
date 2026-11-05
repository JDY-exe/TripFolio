const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Event = require("../models/event");
const Reservation = require("../models/Reservation");
const {
  checkedUpdate,
  checkChanges,
  checkedDelete,
} = require("../utils/checkedUpdate");
const { backfillRecordVersions } = require("../scripts/backfillRecordVersions");

const event = () => ({
  _id: new mongoose.Types.ObjectId(),
  itineraryID: new mongoose.Types.ObjectId(),
  version: 3,
  title: "Walk",
  notes: "",
  address: "",
  startTime: new Date("2026-08-01T09:00:00Z"),
  endTime: new Date("2026-08-01T12:00:00Z"),
  eventType: "activity",
});
const fields = ["title", "notes", "startTime", "endTime", "address", "placeId"];
const request = (expectedVersion, changes, original) => ({
  expectedVersion,
  changes,
  original,
});
/** Provides a deterministic CAS store with real schema casting and validation. */
const store = (initial) => {
  let current = initial;
  let race;
  const oldFind = Event.findById;
  const oldUpdate = Event.findOneAndUpdate;
  Event.findById = async () => current && Event.hydrate(current);
  Event.findOneAndUpdate = async (filter, update) => {
    if (race) {
      const run = race;
      race = null;
      run(current);
      return null;
    }
    assert.equal(filter.version, current.version);
    assert.deepEqual(update.$inc, { version: 1 });
    current = { ...current, ...update.$set, version: current.version + 1 };
    return Event.hydrate(current);
  };
  return {
    get: () => current,
    race: (callback) => {
      race = callback;
    },
    restore: () => {
      Event.findById = oldFind;
      Event.findOneAndUpdate = oldUpdate;
    },
  };
};
const save = (record, patch, prepare) =>
  checkedUpdate({
    Model: Event,
    id: record._id,
    request: patch,
    fields,
    groups: [["address", "placeId"]],
    authorize: async () => {},
    prepare,
  });

test("stale event start-time and notes edits merge, preserving both and incrementing twice", async () => {
  const original = event();
  const db = store(original);
  try {
    await save(
      original,
      request(
        3,
        { startTime: "2026-08-01T10:00:00Z" },
        { startTime: original.startTime },
      ),
    );
    const saved = await save(
      original,
      request(3, { notes: "Bring an umbrella" }, { notes: "" }),
    );
    assert.equal(saved.version, 5);
    assert.equal(saved.notes, "Bring an umbrella");
    assert.equal(saved.startTime.toISOString(), "2026-08-01T10:00:00.000Z");
  } finally {
    db.restore();
  }
});
test("overlapping edits return current record and field details, saving nothing", async () => {
  const original = event();
  const db = store({
    ...original,
    version: 4,
    startTime: new Date("2026-08-01T10:00:00Z"),
  });
  try {
    await assert.rejects(
      save(
        original,
        request(
          3,
          { startTime: "2026-08-01T11:00:00Z", notes: "Keep me" },
          { startTime: original.startTime, notes: "" },
        ),
      ),
      (error) => {
        assert.equal(error.status, 409);
        assert.equal(error.payload.code, "EDIT_CONFLICT");
        assert.equal(error.payload.current.version, 4);
        assert.equal(error.payload.conflicts[0].field, "startTime");
        assert.equal(error.payload.conflicts.length, 1);
        return true;
      },
    );
    assert.equal(db.get().version, 4);
    assert.equal(db.get().notes, "");
  } finally {
    db.restore();
  }
});
test("a lost conditional write reloads and merges a disjoint race", async () => {
  const original = event();
  const db = store(original);
  db.race((current) => {
    current.title = "New title";
    current.version++;
  });
  try {
    const saved = await save(
      original,
      request(3, { notes: "Mine" }, { notes: "" }),
    );
    assert.equal(saved.title, "New title");
    assert.equal(saved.notes, "Mine");
    assert.equal(saved.version, 5);
  } finally {
    db.restore();
  }
});
test("a lost conditional write rechecks an overlapping race instead of overwriting", async () => {
  const original = event();
  const db = store(original);
  db.race((current) => {
    current.notes = "Racing note";
    current.version++;
  });
  try {
    await assert.rejects(
      save(original, request(3, { notes: "Mine" }, { notes: "" })),
      { status: 409 },
    );
    assert.equal(db.get().notes, "Racing note");
  } finally {
    db.restore();
  }
});
test("complete merged validation rejects invalid independent time edits without writing", async () => {
  const original = event();
  const db = store({
    ...original,
    version: 4,
    startTime: new Date("2026-08-01T11:00:00Z"),
  });
  try {
    await assert.rejects(
      save(
        original,
        request(
          3,
          { endTime: "2026-08-01T10:00:00Z" },
          { endTime: original.endTime },
        ),
        async (merged) => {
          if (merged.endTime <= merged.startTime)
            throw Object.assign(new Error("Invalid range"), { status: 400 });
        },
      ),
      { status: 400 },
    );
    assert.equal(db.get().version, 4);
    assert.equal(
      db.get().endTime.toISOString(),
      original.endTime.toISOString(),
    );
  } finally {
    db.restore();
  }
});
test("date encodings and empty optionals compare consistently, and identity values are coupled", () => {
  const current = Event.hydrate({ ...event(), version: 4 });
  assert.deepEqual(
    checkChanges(
      Event,
      current,
      request(
        3,
        { startTime: "2026-08-01T10:00:00Z", notes: "New" },
        { startTime: "2026-08-01T09:00:00+00:00", notes: null },
      ),
      fields,
    ),
    { startTime: "2026-08-01T10:00:00Z", notes: "New" },
  );
  assert.throws(
    () =>
      checkChanges(
        Event,
        current,
        request(3, { address: "Other" }, { address: "" }),
        fields,
        [["address", "placeId"]],
      ),
    { status: 400 },
  );
});
test("separate reservation records have independent versions and segment arrays are atomic", () => {
  const flight = {
    version: 4,
    notes: "",
    flights: { segments: [{ flightNum: "A" }] },
  };
  const hotel = { version: 0, notes: "" };
  assert.deepEqual(
    checkChanges(
      Reservation,
      hotel,
      request(0, { notes: "Hotel" }, { notes: "" }),
      ["notes"],
    ),
    { notes: "Hotel" },
  );
  assert.throws(
    () =>
      checkChanges(
        Reservation,
        flight,
        request(3, { "flights.segments": [] }, { "flights.segments": [] }),
        ["flights.segments"],
      ),
    { status: 409 },
  );
});
test("unchecked patches and stale deletes are rejected", async () => {
  const current = Event.hydrate(event());
  assert.throws(
    () => checkChanges(Event, current, { notes: "unchecked" }, fields),
    { status: 400 },
  );
  assert.throws(
    () =>
      checkChanges(
        Event,
        current,
        request(3, { notes: "unchecked" }, {}),
        fields,
      ),
    { status: 400 },
  );
  await assert.rejects(checkedDelete(Event, current, 2), { status: 409 });
  await assert.rejects(checkedDelete(Event, current, undefined), {
    status: 400,
  });
});
test("new records start at zero and backfill is idempotent and preserves existing versions", async () => {
  assert.equal(new Event(event()).version, 3);
  assert.equal(new Reservation().version, 0);
  const records = [{ name: "old" }, { name: "current", version: 7 }];
  const fake = {
    modelName: "Fake",
    collection: {
      updateMany: async (filter, update) => {
        assert.deepEqual(filter, { version: { $exists: false } });
        assert.deepEqual(update, { $set: { version: 0 } });
        let modifiedCount = 0;
        records.forEach((record) => {
          if (!Object.hasOwn(record, "version")) {
            record.version = 0;
            modifiedCount++;
          }
        });
        return { modifiedCount };
      },
    },
  };
  await backfillRecordVersions([fake]);
  await backfillRecordVersions([fake]);
  assert.deepEqual(records, [
    { name: "old", version: 0 },
    { name: "current", version: 7 },
  ]);
});
