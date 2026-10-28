require("dotenv").config();
const mongoose = require("mongoose");
require("../models/trip");
const { reconcilePhotos } = require("../services/photoCleanup");

const main = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    await mongoose.connect(process.env.MONGO_URI);
    await reconcilePhotos();
    console.log("Photo reconciliation complete");
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
