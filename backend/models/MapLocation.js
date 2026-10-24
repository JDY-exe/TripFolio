const mongoose = require("mongoose");

// Address results are shared across trips; only coordinates are retained.
const mapLocationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, unique: true },
    lat: Number,
    lng: Number,
  },
  { timestamps: true },
);

module.exports = mongoose.model("MapLocation", mapLocationSchema);
