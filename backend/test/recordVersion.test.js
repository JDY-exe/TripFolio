const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Event = require("../models/event");

test("explicit version starts at zero and internal document/query writes increment it", async (t) => {
  const document = new Event({
    itineraryID: new mongoose.Types.ObjectId(),
    title: "Walk",
    startTime: "2030-04-01T09:00:00Z",
    endTime: "2030-04-01T10:00:00Z",
  });
  let persisted;
  t.mock.method(Event.collection, "insertOne", async (value) => {
    persisted = { ...value };
    return { insertedId: value._id };
  });
  t.mock.method(Event.collection, "updateOne", async (filter, update) => {
    assert.equal(filter.version, persisted.version);
    Object.assign(persisted, update.$set);
    persisted.version += update.$inc.version;
    return { matchedCount: 1, modifiedCount: 1 };
  });
  await document.save();
  assert.equal(document.version, 0);
  assert.equal(persisted.__v, undefined);
  document.notes = "Internal sync";
  await document.save();
  assert.equal(document.version, 1);
  document.increment();
  await document.save();
  assert.equal(document.version, 2);
  t.mock.method(
    Event.collection,
    "findOneAndUpdate",
    async (_filter, update) => {
      assert.equal(update.$inc.version, 1);
      assert.equal(update.$set.version, undefined);
      return { ...persisted, ...update.$set, version: persisted.version + 1 };
    },
  );
  const updated = await Event.findOneAndUpdate(
    { _id: document._id },
    { $set: { title: "Query update", version: 999 } },
    { returnDocument: "after" },
  );
  assert.equal(updated.version, 3);
  await assert.rejects(
    Event.replaceOne({ _id: document._id }, document.toObject()),
    /Use checked updates/,
  );
});
