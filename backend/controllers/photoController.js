const mongoose = require("mongoose");
const { pipeline } = require("node:stream/promises");
const Photo = require("../models/Photo");
const Trip = require("../models/trip");
const Itinerary = require("../models/itinerary")
const Event = require("../models/event")
const storage = require("../services/photoStorage");
const { canReadTrip, canEditTrip } = require("../utils/tripAccess");
const { PhotoError, processPhoto } = require("../utils/photoValidation");
const { extractPhotoLocation } = require("../utils/photoMetadata");

/** Checks trip membership before multipart parsing or access to photo records. */
const authorizePhoto = (edit = false) => async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.tripId) ||
      (req.params.photoId && !mongoose.isObjectIdOrHexString(req.params.photoId))) {
      throw new PhotoError("Invalid trip or photo ID");
    }
    const trip = await Trip.findById(req.params.tripId);
    if (!canReadTrip(trip, req.user.id)) throw new PhotoError("Trip not found", 404);
    if (edit && !canEditTrip(trip, req.user.id)) throw new PhotoError("Trip is read-only", 403);
    next();
  } catch (error) {
    next(error);
  }
};

/** Serializes public metadata without leaking internal storage IDs or lifecycle state. */
const serializePhoto = (photo) => ({
  id: String(photo._id),
  trip: String(photo.trip),
  uploadedBy: String(photo.uploadedBy),
  originalName: photo.originalName,
  contentType: photo.contentType,
  byteLength: photo.byteLength,
  width: photo.width,
  height: photo.height,
  createdAt: photo.createdAt,
  contentUrl: `/trip/${photo.trip}/photos/${photo._id}/content`,
  location: photo.location || null,
  linkedEvent: photo.linkedEvent
  ? String(photo.linkedEvent)
  : null,
});

/** Processes a single image and compensates for failures after storing its bytes. */
const uploadPhoto = async (req, res, next) => {
  let fileId;
  let photoId;
  try {
    if (Object.keys(req.body || {}).length > 0) throw new PhotoError("Unexpected upload fields");
    const originalBuffer = req.file?.buffer;
    const location = await extractPhotoLocation(originalBuffer);
    // Find the itinerary belonging to this trip.
    const itinerary = await Itinerary.findOne({ tripId: req.params.tripId }).select("_id");
    let linkedEvent = null;
    if (location && itinerary) {
      const events = await Event.find({
        itineraryID: itinerary._id,
        lat: { $exists: true, $ne: null },
        lng: { $exists: true, $ne: null },
      }).lean();

      linkedEvent = findClosestEvent(location, events);
    }
    const { data, info } = await processPhoto(originalBuffer);
    if (req.aborted || res.destroyed) throw new PhotoError("Upload cancelled");
    fileId = await storage.upload(data, req.params.tripId);
    const trip = await Trip.findById(req.params.tripId);
    if (!canEditTrip(trip, req.user.id)) throw new PhotoError("Trip is no longer editable", 403);
    if (req.aborted || res.destroyed) throw new PhotoError("Upload cancelled");
    // Never use the original filename as a filesystem path or response header.
    const originalName = req.file.originalname.split(/[\\/]/).pop()
      .replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255) || "photo";
    // Keep the ID even if MongoDB commits the insert but its acknowledgement is lost.
    photoId = new mongoose.Types.ObjectId();
    const photo = await Photo.create({
      _id: photoId, trip: req.params.tripId, uploadedBy: req.user.id, fileId, originalName,
      contentType: "image/webp", byteLength: data.length, width: info.width, height: info.height,
      ...(location && { location }), linkedEvent: linkedEvent?._id ?? null,
    });
    // A trip can disappear between the first permission check and metadata creation.
    const currentTrip = await Trip.findById(req.params.tripId);
    if (!canEditTrip(currentTrip, req.user.id)) throw new PhotoError("Trip is no longer editable", 403);
    res.status(201).json({ photo: serializePhoto(photo) });
  } catch (error) {
    if (fileId) {
      try {
        // Hide any potentially committed record before removing its bytes. If this
        // fails, retain the bytes rather than leave a ready record with no file.
        if (photoId) await Photo.updateOne({ _id: photoId }, { $set: { status: "deleting" } });
        await storage.remove(fileId);
        if (photoId) await Photo.deleteOne({ _id: photoId });
      } catch (cleanupError) {
        console.error("Photo compensation failed; reconciliation required", { photoId, fileId, cleanupError });
      }
    }
    next(error);
  }
};

/** Returns cursor-paginated metadata; the cursor uses timestamp and ID as a stable pair. */
const listPhotos = async (req, res, next) => {
  try {
    const limit = req.query.limit === undefined ? 30 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new PhotoError("Limit must be between 1 and 100");
    const filter = { trip: req.params.tripId, status: "ready" };
    if (req.query.cursor !== undefined) {
      let cursor;
      try {
        if (typeof req.query.cursor !== "string" || req.query.cursor.length > 256) throw new Error();
        cursor = JSON.parse(Buffer.from(req.query.cursor, "base64url").toString());
        if (!mongoose.isObjectIdOrHexString(cursor.id) || typeof cursor.createdAt !== "string" ||
          !Number.isFinite(Date.parse(cursor.createdAt))) throw new Error();
      } catch {
        throw new PhotoError("Invalid photo cursor");
      }
      const date = new Date(cursor.createdAt);
      filter.$or = [{ createdAt: { $lt: date } }, { createdAt: date, _id: { $lt: cursor.id } }];
    }
    const photos = await Photo.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
    const hasMore = photos.length > limit;
    const page = photos.slice(0, limit);
    const last = page[page.length - 1];
    res.json({
      photos: page.map(serializePhoto),
      nextCursor: hasMore ? Buffer.from(JSON.stringify({ id: String(last._id), createdAt: last.createdAt.toISOString() })).toString("base64url") : null
    });
  } catch (error) {
    next(error);
  }
};

/** Streams protected bytes, closing the stream when the client disconnects. */
const getPhotoContent = async (req, res, next) => {
  try {
    const photo = await Photo.findOne({ _id: req.params.photoId, trip: req.params.tripId, status: "ready" });
    if (!photo || !await storage.find(photo.fileId)) throw new PhotoError("Photo not found", 404);
    res.set({ "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    await pipeline(storage.download(photo.fileId), res);
  } catch (error) {
    if (res.headersSent || res.destroyed) {
      if (!res.destroyed) res.destroy(error);
    } else next(error);
  }
};

/** Hides a photo before deleting storage, leaving a retryable tombstone on failure. */
const deletePhoto = async (req, res, next) => {
  try {
    const photo = await Photo.findOneAndUpdate(
      { _id: req.params.photoId, trip: req.params.tripId },
      { $set: { status: "deleting" } }, { returnDocument: "after" }
    );
    if (photo) {
      await storage.remove(photo.fileId);
      await Photo.deleteOne({ _id: photo._id });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const earthRadius = 6371000;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const findClosestEvent = (photoLocation, events, maxDistance = 100) => {
  if (!photoLocation) return null;

  let closestEvent = null;
  let shortestDistance = maxDistance;

  for (const event of events) {
    if (
      !Number.isFinite(event.lat) ||
      !Number.isFinite(event.lng)
    ) {
      continue;
    }

    const distance = calculateDistance(
      photoLocation.latitude,
      photoLocation.longitude,
      event.lat,
      event.lng,
    );

    if (distance <= shortestDistance) {
      shortestDistance = distance;
      closestEvent = event;
    }
  }

  return closestEvent;
};

module.exports = { authorizePhoto, uploadPhoto, listPhotos, getPhotoContent, deletePhoto };
