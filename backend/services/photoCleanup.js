const mongoose = require("mongoose");
const Photo = require("../models/Photo");
const storage = require("./photoStorage");

/** Deletes all album files before their metadata; failures retain retryable records. */
const deleteTripPhotos = async (tripId) => {
  await Photo.updateMany({ trip: tripId }, { $set: { status: "deleting" } });
  for await (const photo of Photo.find({ trip: tripId }).cursor()) {
    await storage.remove(photo.fileId);
    await Photo.deleteOne({ _id: photo._id });
  }
};

/**
 * Repairs stale deleted/orphaned photos and unreferenced completed GridFS files.
 * A grace period avoids racing ordinary uploads. Run on a maintenance schedule.
 * Partial uploads without files documents are intentionally not scanned online.
 */
const reconcilePhotos = async (graceMs = 24 * 60 * 60 * 1000) => {
  const cutoff = new Date(Date.now() - graceMs);
  const Trip = mongoose.model("Trip");
  for await (const photo of Photo.find({ updatedAt: { $lt: cutoff } }).cursor()) {
    if (photo.status === "deleting" || !await Trip.exists({ _id: photo.trip })) {
      await Photo.updateOne({ _id: photo._id }, { $set: { status: "deleting" } });
      await storage.remove(photo.fileId);
      await Photo.deleteOne({ _id: photo._id });
    }
  }
  for await (const file of storage.getBucket().find({ uploadDate: { $lt: cutoff } })) {
    if (!await Photo.exists({ fileId: file._id })) await storage.remove(file._id);
  }
};

module.exports = { deleteTripPhotos, reconcilePhotos };
