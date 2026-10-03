const Trip = require("../models/trip");
const Itinerary = require("../models/itinerary");
const mongoose = require("mongoose");
const { validateTripProfilePicture } = require("../utils/tripMedia");

const createTrip = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate dates
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    const newTrip = new Trip({ name, startDate, endDate });
    const savedTrip = await newTrip.save();

    res.status(201).json({ savedTrip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 });
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTrip = async (req, res) => {
  try {
    const deletedTrip = await Trip.findByIdAndDelete(req.params.id);
    if (!deleteTrip) {
      return res.status(400).json({ message: 'Trip not found' });
    }
    
    await Itinerary.deleteMany({ tripId: req.params.id });

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
    if (!trip || !trip.profilePictureId) {
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
    res.set("Cache-Control", "public, max-age=3600");
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
    const trips = await Trip.find({ users: req.user.id });

    return res.status(200).json({ trips });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};

const addUserToTrip = async (req, res) => {
  try {
    const { tripId, userId } = req.body;
    if (!tripId || !userId) {
      return res.status(400).json({
        message: "tripId and userId are required"
      });
    }
    const trip = await Trip.findByIdAndUpdate(
      tripId,
      { $addToSet: { users: userId } },
      { new: true }
    );
    if (!trip) {
      return res.status(404).json({
        message: "Trip no found"
      });
    }
    return res.status(200).json({
      message: "User added to trip successfully",
      trip
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
}

module.exports = {
  createTrip,
  getTrips,
  deleteTrip,
  updateTripProfilePicture,
  getTripProfilePicture,
  getTripFromUser,
  addUserToTrip
};
