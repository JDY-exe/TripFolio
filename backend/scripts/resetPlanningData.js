// Defaults to inventory only. --apply verifies a BSON-preserving backup before reset.
// --restore <backup-directory> restores only into empty planning collections.
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true,
});
const { EJSON } = mongoose.mongo.BSON;
const digest = (text) => crypto.createHash("sha256").update(text).digest("hex");

/** Durably writes a private file; never overwrites an existing backup. */
const durableWrite = async (filename, text) => {
  const file = await fs.open(filename, "wx", 0o600);
  try {
    await file.writeFile(text);
    await file.sync();
  } finally {
    await file.close();
  }
};
/** Writes and re-reads a canonical Extended JSON snapshot, preserving ObjectIds and dates. */
const writeBackup = async (directory, target, snapshot) => {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const text = EJSON.stringify(snapshot, { relaxed: false });
  await durableWrite(path.join(directory, "planning.ejson"), text);
  const manifest = {
    format: 1,
    createdAt: new Date().toISOString(),
    target,
    sha256: digest(text),
    counts: {
      events: snapshot.events.length,
      reservations: snapshot.reservations.length,
      trips: snapshot.tripReferences.length,
      photoLinks: snapshot.photoReferences?.length || 0,
    },
  };
  await durableWrite(
    path.join(directory, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  const verified = await readBackup(directory);
  if (EJSON.stringify(verified.snapshot, { relaxed: false }) !== text)
    throw new Error(
      "Backup round-trip verification failed; no deletion allowed",
    );
  const folder = await fs.open(directory, "r");
  try {
    await folder.sync();
  } finally {
    await folder.close();
  }
  return manifest;
};
/** Verifies snapshot integrity and counts before any restore or deletion. */
const readBackup = async (directory) => {
  const manifest = JSON.parse(
    await fs.readFile(path.join(directory, "manifest.json"), "utf8"),
  );
  const text = await fs.readFile(
    path.join(directory, "planning.ejson"),
    "utf8",
  );
  if (manifest.format !== 1 || digest(text) !== manifest.sha256)
    throw new Error("Backup checksum/format mismatch");
  const snapshot = EJSON.parse(text, { relaxed: false });
  for (const [field, count] of [
    ["events", "events"],
    ["reservations", "reservations"],
    ["tripReferences", "trips"],
  ]) {
    if (
      !Array.isArray(snapshot[field]) ||
      snapshot[field].length !== manifest.counts[count]
    )
      throw new Error("Backup collection count mismatch");
  }
  if (
    (snapshot.photoReferences?.length || 0) !==
    (manifest.counts.photoLinks || 0)
  )
    throw new Error("Backup photo-reference count mismatch");
  return { manifest, snapshot };
};
/** Deletes planning records and clears only their trip/photo reference fields. */
const reset = async (db, target, root) => {
  let directory;
  let manifest;
  await mongoose.connection.transaction(
    async (session) => {
      const snapshot = {
        events: await db.collection("events").find({}, { session }).toArray(),
        reservations: await db
          .collection("reservations")
          .find({}, { session })
          .toArray(),
        tripReferences: await db
          .collection("trips")
          .find({}, { session, projection: { _id: 1, reservations: 1 } })
          .toArray(),
        photoReferences: await db
          .collection("photos")
          .find(
            { linkedEvent: { $ne: null } },
            { session, projection: { _id: 1, linkedEvent: 1 } },
          )
          .toArray(),
      };
      directory = path.join(
        root,
        `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(4).toString("hex")}`,
      );
      manifest = await writeBackup(directory, target, snapshot);
      console.log(
        JSON.stringify({ verifiedBackup: directory, counts: manifest.counts }),
      );
      const events = await db.collection("events").deleteMany({}, { session });
      const reservations = await db
        .collection("reservations")
        .deleteMany({}, { session });
      if (
        events.deletedCount !== snapshot.events.length ||
        reservations.deletedCount !== snapshot.reservations.length
      )
        throw new Error("Planning records changed; reset aborted");
      for (const photo of snapshot.photoReferences) {
        const result = await db
          .collection("photos")
          .updateOne(
            { _id: photo._id, linkedEvent: photo.linkedEvent },
            { $set: { linkedEvent: null } },
            { session },
          );
        if (result.matchedCount !== 1)
          throw new Error("Photo linkage changed; reset aborted");
      }
      const trips = await db
        .collection("trips")
        .updateMany(
          { reservations: { $exists: true } },
          { $set: { reservations: [] } },
          { session },
        );
      console.log(
        JSON.stringify({
          stagedDeletion: {
            events: events.deletedCount,
            reservations: reservations.deletedCount,
          },
          tripReferencesCleared: trips.modifiedCount,
        }),
      );
    },
    {
      readPreference: "primary",
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    },
  );
  await durableWrite(
    path.join(directory, "reset-committed.json"),
    JSON.stringify(
      { committedAt: new Date().toISOString(), counts: manifest.counts },
      null,
      2,
    ),
  );
  const remaining = {
    events: await db.collection("events").countDocuments(),
    reservations: await db.collection("reservations").countDocuments(),
  };
  console.log(
    JSON.stringify({ resetCommitted: true, backup: directory, remaining }),
  );
  if (remaining.events || remaining.reservations)
    throw new Error(
      "New records appeared after the reset; they were NOT deleted. Pause all writers before repeating.",
    );
};
/** Restores raw planning records and saved trip/photo references without overwriting new data. */
const restore = async (db, target, directory) => {
  const { manifest, snapshot } = await readBackup(directory);
  if (JSON.stringify(manifest.target) !== JSON.stringify(target))
    throw new Error("Backup belongs to a different database/server");
  await mongoose.connection.transaction(
    async (session) => {
      if (
        (await db.collection("events").countDocuments({}, { session })) ||
        (await db.collection("reservations").countDocuments({}, { session })) ||
        (await db
          .collection("trips")
          .countDocuments({ "reservations.0": { $exists: true } }, { session }))
      )
        throw new Error(
          "Restore refused: new planning data exists. Back it up and explicitly clear it first.",
        );
      for (const trip of snapshot.tripReferences) {
        if (
          !(await db
            .collection("trips")
            .findOne({ _id: trip._id }, { session, projection: { _id: 1 } }))
        )
          throw new Error("Restore refused: an original trip no longer exists");
      }
      for (const photo of snapshot.photoReferences || []) {
        const current = await db
          .collection("photos")
          .findOne(
            { _id: photo._id },
            { session, projection: { _id: 1, linkedEvent: 1 } },
          );
        if (!current || current.linkedEvent)
          throw new Error(
            "Restore refused: a linked photo is missing or has a new event link",
          );
      }
      if (snapshot.events.length)
        await db.collection("events").insertMany(snapshot.events, { session });
      if (snapshot.reservations.length)
        await db
          .collection("reservations")
          .insertMany(snapshot.reservations, { session });
      for (const photo of snapshot.photoReferences || [])
        await db
          .collection("photos")
          .updateOne(
            { _id: photo._id },
            { $set: { linkedEvent: photo.linkedEvent } },
            { session },
          );
      for (const trip of snapshot.tripReferences)
        await db
          .collection("trips")
          .updateOne(
            { _id: trip._id },
            Object.hasOwn(trip, "reservations")
              ? { $set: { reservations: trip.reservations } }
              : { $unset: { reservations: "" } },
            { session },
          );
    },
    {
      readPreference: "primary",
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    },
  );
  console.log(JSON.stringify({ restored: manifest.counts, backup: directory }));
};
const main = async () => {
  const args = process.argv.slice(2);
  if (!(
    args.length === 0 ||
    (args.length === 1 && args[0] === "--apply") ||
    (args.length === 2 && args[0] === "--restore")
  ))
    throw new Error(
      "Usage: node scripts/resetPlanningData.js [--apply | --restore <directory>]",
    );
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: false,
  });
  try {
    const db = mongoose.connection.db;
    const options = mongoose.connection.getClient().options;
    const target = {
      database: db.databaseName,
      server:
        options.srvHost ||
        options.hosts
          .map((host) => String(host))
          .sort()
          .join(","),
    };
    if (args[0] === "--restore")
      return await restore(db, target, path.resolve(args[1]));
    console.log(
      JSON.stringify({
        target,
        counts: {
          events: await db.collection("events").countDocuments(),
          reservations: await db.collection("reservations").countDocuments(),
          trips: await db.collection("trips").countDocuments(),
        },
      }),
    );
    if (args[0] !== "--apply") {
      console.log("Inventory only. Stop application writers before --apply.");
      return;
    }
    await reset(
      db,
      target,
      path.join(
        os.homedir(),
        ".local",
        "share",
        "TripFolio",
        "backups",
        "planning",
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
};
if (require.main === module)
  main().catch((error) => {
    console.error(
      String(error.message).replace(
        /mongodb(?:\+srv)?:\/\/\S+/g,
        "[MongoDB URI redacted]",
      ),
    );
    process.exitCode = 1;
  });
module.exports = { writeBackup, readBackup, reset, restore };
