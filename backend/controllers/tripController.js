const Trip = require("../models/trip");
const Itinerary = require("../models/itinerary");
const Event = require("../models/event");
const User = require("../models/User");
const TripInvitation = require("../models/TripInvitation");

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
    const travelerIds = [...new Set(trips.flatMap((trip) =>
      [trip.ownerId, ...trip.users].filter(Boolean).map(String)
    ))];
    const travelers = await User.find({ _id: { $in: travelerIds } })
      .select("username profile_picture").lean();
    const travelersById = new Map(travelers.map((traveler) => [String(traveler._id), traveler]));
    res.status(200).json(trips.map((trip) => ({
      ...(typeof trip.toObject === 'function' ? trip.toObject() : trip),
      travelers: [...new Set([trip.ownerId, ...trip.users].filter(Boolean).map(String))]
        .map((id) => travelersById.get(id))
        .filter(Boolean)
        .map((traveler) => ({
          id: String(traveler._id),
          username: traveler.username,
          profile_picture: traveler.profile_picture ?? null
        }))
    })));
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
    if (getTripRole(trip, req.user.id) !== "owner") {
      return res.status(getTripRole(trip, req.user.id) ? 403 : 404).json({
        message: "Only the trip owner can change the trip picture"
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
    const pendingInvitation = trip && !canReadTrip(trip, req.user.id)
      ? await TripInvitation.exists({ trip: trip._id, recipient: req.user.id, status: "pending" })
      : false;
    if (!trip || (!canReadTrip(trip, req.user.id) && !pendingInvitation) || !trip.profilePictureId) {
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

/** Creates every requested invitation in one transaction, or saves none of them. */
const shareTrip = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const { recipientIds } = req.body || {};

    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }
    if (
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0 ||
      recipientIds.some(
        (id) => typeof id !== "string" || !mongoose.isValidObjectId(id)
      )
    ) {
      return res
        .status(400)
        .json({
          message: "A non-empty array of valid recipientIds is required"
        });
    }
    const normalizedIds = recipientIds.map((id) =>
      new mongoose.Types.ObjectId(id).toString()
    );
    if (new Set(normalizedIds).size !== normalizedIds.length) {
      return res
        .status(400)
        .json({ message: "recipientIds must not contain duplicates" });
    }

    const invitations = await mongoose.connection.transaction(
      async (session) => {
        const trip = await Trip.findById(tripId).session(session);
        if (!trip) {
          throw Object.assign(new Error("Trip not found"), { status: 404 });
        }
        if (!canEditTrip(trip, req.user.id)) {
          throw Object.assign(
            new Error("Only trip owners and editors can share this trip"),
            { status: 403 }
          );
        }
        const recipients = await User.find({
          _id: { $in: normalizedIds }
        }).session(session);
        if (recipients.length !== normalizedIds.length) {
          throw Object.assign(
            new Error("One or more recipient profiles were not found"),
            { status: 404 }
          );
        }
        if (normalizedIds.some((id) => getTripRole(trip, id))) {
          throw Object.assign(
            new Error("One or more recipients are already trip members"),
            { status: 409 }
          );
        }
        const existingInvitation = await TripInvitation.findOne({
          trip: tripId,
          recipient: { $in: normalizedIds },
          status: "pending"
        }).session(session);
        if (existingInvitation) {
          throw Object.assign(
            new Error(
              "A pending invitation already exists for one or more recipients"
            ),
            { status: 409 }
          );
        }
        return TripInvitation.insertMany(
          normalizedIds.map((recipient) => ({
            trip: tripId,
            recipient,
            inviter: req.user.id
          })),
          { session, ordered: true }
        );
      }
    );

    return res.status(201).json({
      message: "Trip invitations created",
      invitations
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "A pending invitation already exists for one or more recipients"
      });
    }
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Unable to send trip invitations"
    });
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

/** Lists pending invitations belonging to the authenticated recipient. */
const getTripInvitations = async (req, res) => {
  try {
    const invitations = await TripInvitation.find({ recipient: req.user.id, status: "pending" })
      .populate({ path: "trip", select: "name startDate endDate profilePictureId ownerId users",
        populate: { path: "ownerId", select: "username profile_picture" } })
      .populate("inviter", "username")
      .sort({ createdAt: -1 });
    const results = await Promise.all(invitations.filter((invitation) => invitation.trip).map(async (invitation) => {
      const trip = invitation.trip;
      const owner = trip.ownerId || (trip.users?.[0]
        ? await User.findById(trip.users[0]).select("username profile_picture") : null);
      return {
        _id: invitation._id,
        trip: { _id: trip._id, name: trip.name, startDate: trip.startDate,
          endDate: trip.endDate, profilePictureId: trip.profilePictureId,
          owner: owner ? { username: owner.username, profile_picture: owner.profile_picture } : null },
        inviter: invitation.inviter
      };
    }));
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ message: "Unable to load invitations" });
  }
};

/** Records a recipient's response; acceptance adds membership without duplicates. */
const respondToTripInvitation = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status) || !mongoose.isValidObjectId(req.params.invitationId)) {
      return res.status(400).json({ message: "Invalid invitation response" });
    }
    const invitation = await TripInvitation.findOne({
      _id: req.params.invitationId, recipient: req.user.id, status: "pending"
    });
    if (!invitation) return res.status(404).json({ message: "Pending invitation not found" });
    if (status === "accepted") {
      const trip = await Trip.findByIdAndUpdate(invitation.trip,
        { $addToSet: { users: req.user.id } }, { new: true });
      if (!trip) return res.status(404).json({ message: "Trip no longer exists" });
    }
    invitation.status = status;
    await invitation.save();
    return res.status(200).json({ invitation });
  } catch (error) {
    return res.status(500).json({ message: "Unable to respond to invitation" });
  }
};

module.exports = {
  getTripInvitations,
  respondToTripInvitation,
  createTrip,
  getTrips,
  getTrip,
  updateTripVisibility,
  deleteTrip,
  updateTripProfilePicture,
  getTripProfilePicture,
  getTripFromUser,
  shareTrip,
  addUserToTrip
};
