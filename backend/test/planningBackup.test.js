const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const { writeBackup, readBackup } = require("../scripts/resetPlanningData");

test("planning backup preserves BSON identity, dates, arrays and field absence and detects corruption", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "tripfolio-backup-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const { ObjectId, Decimal128, Binary, EJSON } = mongoose.mongo.BSON;
  const snapshot = {
    events: [
      {
        _id: new ObjectId(),
        startTime: new Date("2027-04-01T15:00:00Z"),
        notes: "Personal",
        attachment: new Binary(Buffer.from("bytes")),
      },
    ],
    reservations: [
      { _id: new ObjectId(), cost: Decimal128.fromString("12.50") },
    ],
    tripReferences: [
      { _id: new ObjectId(), reservations: [] },
      { _id: new ObjectId() },
    ],
    photoReferences: [{ _id: new ObjectId(), linkedEvent: new ObjectId() }],
  };
  const manifest = await writeBackup(
    directory,
    { database: "test", server: "example" },
    snapshot,
  );
  const restored = await readBackup(directory);
  assert.equal(
    EJSON.stringify(restored.snapshot, { relaxed: false }),
    EJSON.stringify(snapshot, { relaxed: false }),
  );
  assert.equal(
    restored.snapshot.events[0]._id.toHexString(),
    snapshot.events[0]._id.toHexString(),
  );
  assert.ok(restored.snapshot.events[0].startTime instanceof Date);
  assert.equal(
    Object.hasOwn(restored.snapshot.tripReferences[1], "reservations"),
    false,
  );
  assert.deepEqual(manifest.counts, {
    events: 1,
    reservations: 1,
    trips: 2,
    photoLinks: 1,
  });
  assert.equal(
    restored.snapshot.photoReferences[0].linkedEvent.toHexString(),
    snapshot.photoReferences[0].linkedEvent.toHexString(),
  );
  const fileStats = await fs.stat(
    path.join(directory, "planning.ejson"),
  );

  if (process.platform !== "win32") {
    assert.equal(fileStats.mode & 0o777, 0o600);
  }
  await assert.rejects(writeBackup(directory, {}, snapshot), {
    code: "EEXIST",
  });
  await fs.appendFile(path.join(directory, "planning.ejson"), "corrupt");
  await assert.rejects(readBackup(directory), /checksum/);
});
