// From backend/: node scripts/migrateDocumentVersions.js [--apply]
const path = require("node:path");
const mongoose = require("mongoose");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true,
});
const models = [
  require("../models/trip"),
  require("../models/itinerary"),
  require("../models/event"),
  require("../models/Reservation"),
];

/** Returns whether an existing version is a valid monotonic counter. */
const isValidVersion = (version) =>
  Number.isSafeInteger(version) &&
  version >= 0 &&
  version < Number.MAX_SAFE_INTEGER;

/** Initializes missing persisted versions without touching timestamps or existing counters. */
const migrateCollections = async (collections, apply = false) => {
  const reports = [];
  for (const collection of collections) {
    const invalidIds = [];
    for await (const document of collection.find(
      { version: { $exists: true } },
      { projection: { version: 1 } },
    )) {
      if (!isValidVersion(document.version))
        invalidIds.push(String(document._id));
    }
    reports.push({
      collection: collection.collectionName,
      eligible: await collection.countDocuments({
        version: { $exists: false },
      }),
      invalidIds,
    });
  }
  console.log(JSON.stringify(reports, null, 2));
  if (reports.some((report) => report.invalidIds.length > 0))
    throw new Error("Invalid existing versions; no writes were made");
  if (!apply) return reports;
  for (const [index, collection] of collections.entries()) {
    const result = await collection.updateMany(
      { version: { $exists: false } },
      { $set: { version: 0 } },
    );
    reports[index].updated = result.modifiedCount;
  }
  console.log(JSON.stringify(reports, null, 2));
  return reports;
};

/** Connects using the repository migration configuration and always disconnects. */
const migrateDocumentVersions = async (apply) => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  try {
    await mongoose.connect(process.env.MONGO_URI);
    return await migrateCollections(
      models.map((model) => model.collection),
      apply,
    );
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    args.some((arg) => !["--apply", "--help"].includes(arg))
  ) {
    console.error("Usage: node scripts/migrateDocumentVersions.js [--apply]");
    process.exitCode = 2;
  } else if (args.includes("--help")) {
    console.log(
      "Dry-run by default. Pass --apply to initialize missing Trip, Itinerary, Event, and Reservation versions to 0.",
    );
  } else {
    migrateDocumentVersions(args.includes("--apply")).catch((error) => {
      console.error(`Version migration failed: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
module.exports = { isValidVersion, migrateCollections };
