const mongoose = require("mongoose");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const models = [
  require("../models/event"),
  require("../models/Reservation"),
  require("../models/itinerary"),
  require("../models/trip"),
  require("../models/ArchivedItineraryNote"),
];
/** Backfills missing versions using raw collections: no timestamps or business writes. */
const backfillRecordVersions = async (editableModels = models) => {
  for (const Model of editableModels) {
    const result = await Model.collection.updateMany(
      { version: { $exists: false } },
      { $set: { version: 0 } },
    );
    console.log(
      `${Model.modelName}: initialized ${result.modifiedCount} versions`,
    );
  }
};
if (require.main === module) {
  (async () => {
    try {
      if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
      await mongoose.connect(process.env.MONGO_URI);
      await backfillRecordVersions();
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}
module.exports = { backfillRecordVersions };
