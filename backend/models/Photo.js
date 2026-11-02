const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  originalName: { type: String, required: true, maxlength: 255 },
  contentType: { type: String, enum: ["image/webp"], required: true },
  byteLength: { type: Number, required: true, min: 1 },
  width: { type: Number, required: true, min: 1 },
  height: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["ready", "deleting"], default: "ready" },
  location: {
    latitude: {type: Number, min: -90, max: 90},
    longitude: {type: Number, min: -180, max: 180},
    altitude: {type: Number}
  },
  linkedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    default: null
  }
}, { timestamps: true });

photoSchema.index({ trip: 1, status: 1, createdAt: -1, _id: -1 });
module.exports = mongoose.model("Photo", photoSchema);
