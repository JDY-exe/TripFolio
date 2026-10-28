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
  status: { type: String, enum: ["ready", "deleting"], default: "ready" }
}, { timestamps: true });

photoSchema.index({ trip: 1, status: 1, createdAt: -1, _id: -1 });
module.exports = mongoose.model("Photo", photoSchema);
