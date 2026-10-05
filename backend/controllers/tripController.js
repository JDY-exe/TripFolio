const Trip = require("../models/trip");
const Itinerary = require("../models/itinerary");
const Event = require("../models/event");

const mongoose = require("mongoose");
const { validateTripProfilePicture } = require("../utils/tripMedia");
const { canEditTrip, canReadTrip, getTripRole } = require("../utils/tripAccess");

const serializeTripForUser = (trip, userId) => ({
  ...(typeof trip.toObject === "function" ? trip.toObject() : trip),
  currentUserRole: getTripRole(trip, userId)
});

const createTrip = async (req, res) => {
  try {
    const { name, startDate, endDate, isPublic = false } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ message: "isPublic must be a boolean" });
    }

    // Validate dates
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    const newTrip = new Trip({
      name,
      startDate,
      endDate,
      isPublic,
      ownerId: req.user.id,
      users: [req.user.id]
    });
    const savedTrip = await newTrip.save();

    res.status(201).json({ savedTrip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      $or: [{ ownerId: req.user.id }, { users: req.user.id }]
    }).sort({ createdAt: -1 });
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrip = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip || !canReadTrip(trip, req.user.id)) {
      return res.status(404).json({ message: "Trip not found" });
    }

    return res.status(200).json(serializeTripForUser(trip, req.user.id));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateTripVisibility = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }
    if (typeof req.body.isPublic !== "boolean") {
      return res.status(400).json({ message: "isPublic must be a boolean" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip || !getTripRole(trip, req.user.id)) {
      return res.status(404).json({ message: "Trip not found" });
    }
    if (getTripRole(trip, req.user.id) !== "owner") {
      return res.status(403).json({ message: "Only the trip owner can change visibility" });
    }

    trip.isPublic = req.body.isPublic;
    await trip.save();
    return res.status(200).json(serializeTripForUser(trip, req.user.id));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip || !getTripRole(trip, req.user.id)) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (getTripRole(trip, req.user.id) !== "owner") {
      return res.status(403).json({ message: 'Only the trip owner can delete it' });
    }

    const deletedTrip = await Trip.findByIdAndDelete(req.params.id);
    if (!deletedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (deletedTrip.profilePictureId) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "tripProfilePictures"
      });
      await bucket.delete(deletedTrip.profilePictureId).catch(() => undefined);
    }

    return res.status(200).json({ message: 'Trip successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting trip', error: error.message });
  }
};

const updateTripProfilePicture = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const validationMessage = validateTripProfilePicture(req.file);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    if (!canEditTrip(trip, req.user.id)) {
      return res.status(getTripRole(trip, req.user.id) ? 403 : 404).json({
        message: "You cannot update this trip cover"
      });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "tripProfilePictures"
    });
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: { contentType: req.file.mimetype }
    });

    await new Promise((resolve, reject) => {
      uploadStream.once("error", reject);
      uploadStream.once("finish", resolve);
      uploadStream.end(req.file.buffer);
    });

    const previousPictureId = trip.profilePictureId;
    trip.profilePictureId = uploadStream.id;
    await trip.save();

    if (previousPictureId) {
      await bucket.delete(previousPictureId).catch(() => undefined);
    }

    return res.status(200).json({
      message: "Trip cover updated successfully",
      trip
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTripProfilePicture = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip || !canReadTrip(trip, req.user.id) || !trip.profilePictureId) {
      return res.status(404).json({ message: "Trip cover not found" });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "tripProfilePictures"
    });
    const [picture] = await bucket
      .find({ _id: trip.profilePictureId })
      .toArray();

    if (!picture) {
      return res.status(404).json({ message: "Trip cover not found" });
    }

    res.set("Content-Type", picture.metadata?.contentType || "application/octet-stream");
    res.set("Cache-Control", "private, max-age=3600");
    const downloadStream = bucket.openDownloadStream(trip.profilePictureId);
    downloadStream.on("error", (error) => {
      if (!res.headersSent) {
        res.status(404).json({ message: "Trip cover could not be read" });
      } else {
        res.destroy(error);
      }
    });
    return downloadStream.pipe(res);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
const getTripFromUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    if (String(userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only view your own trips" });
    }
    const trips = await Trip.find({
      $or: [{ ownerId: userId }, { users: userId }]
    });
    return res.status(200).json({ trips });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const addUserToTrip = async (req, res) => {
  try {
    const { tripId, userId, role = "editor" } = req.body;
    if (!tripId || !userId) {
      return res.status(400).json({ message: "tripId and userId are required" });
    }
    if (role !== "editor" && role !== "viewer") {
      return res.status(400).json({ message: "Role must be editor or viewer" });
    }

    const existingTrip = await Trip.findById(tripId);
    if (!existingTrip || getTripRole(existingTrip, req.user.id) !== "owner") {
      return res.status(existingTrip ? 403 : 404).json({
        message: "Only the trip owner can manage its members"
      });
    }

    const update = {
      $addToSet: {
        users: userId,
        ...(role === "viewer" ? { viewerIds: userId } : {})
      },
      ...(role === "editor" ? { $pull: { viewerIds: userId } } : {})
    };
    const trip = await Trip.findByIdAndUpdate(tripId, update, { new: true });
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    return res.status(200).json({
      message: "User added to trip successfully",
      trip
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTrip,
  updateTripVisibility,
  deleteTrip,
  updateTripProfilePicture,
  getTripProfilePicture,
  getTripFromUser,
  addUserToTrip
};
