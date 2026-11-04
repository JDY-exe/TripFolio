const mongoose = require("mongoose");
const ArchivedItineraryNote = require("../models/ArchivedItineraryNote");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const { canReadTrip } = require("../utils/tripAccess");

/**
 * Resolves the archived itinerary for a member without revealing trips they
 * cannot access.
 *
 * @param {string} tripId - Route trip identifier.
 * @param {string} userId - Authenticated user identifier.
 * @returns {Promise<object|null>} The trip and itinerary, or null when unavailable.
 */
const getMemberArchivedItinerary = async (tripId, userId) => {
  if (!mongoose.isValidObjectId(tripId)) {
    return { invalidId: true };
  }

  const trip = await Trip.findById(tripId);
  if (!trip || !trip.archived || !canReadTrip(trip, userId)) {
    return null;
  }

  const itinerary = await Itinerary.findOne({ tripId: trip._id });
  if (!itinerary) {
    return null;
  }

  return { trip, itinerary };
};

/**
 * Loads only the authenticated member's note for an archived itinerary.
 *
 * @param {import("express").Request} req - Authenticated note request.
 * @param {import("express").Response} res - HTTP response to populate.
 * @returns {Promise<import("express").Response>} The member's note or null.
 */
const getArchivedItineraryNote = async (req, res) => {
  try {
    const result = await getMemberArchivedItinerary(
      req.params.tripId,
      req.user.id,
    );
    if (result?.invalidId) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }
    if (!result) {
      return res.status(404).json({ message: "Archived itinerary not found" });
    }

    const note = await ArchivedItineraryNote.findOne({
      itineraryId: result.itinerary._id,
      authorId: req.user.id,
    });
    return res.status(200).json(note);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching archived itinerary note",
      error: error.message,
    });
  }
};

/**
 * Creates the authenticated member's single private note for an archived
 * itinerary.
 *
 * @param {import("express").Request} req - Authenticated request with note content.
 * @param {import("express").Response} res - HTTP response to populate.
 * @returns {Promise<import("express").Response>} The created note or an error.
 */
const createArchivedItineraryNote = async (req, res) => {
  try {
    if (
      typeof req.body?.content !== "string" ||
      req.body.content.trim().length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Note content must be a non-empty string" });
    }

    const result = await getMemberArchivedItinerary(
      req.params.tripId,
      req.user.id,
    );
    if (result?.invalidId) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }
    if (!result) {
      return res.status(404).json({ message: "Archived itinerary not found" });
    }

    const note = await ArchivedItineraryNote.create({
      tripId: result.trip._id,
      itineraryId: result.itinerary._id,
      authorId: req.user.id,
      content: req.body.content,
    });
    return res.status(201).json(note);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A note already exists for this itinerary" });
    }
    return res.status(500).json({
      message: "Error creating archived itinerary note",
      error: error.message,
    });
  }
};

/**
 * Updates only the authenticated member's private note for an archived
 * itinerary.
 *
 * @param {import("express").Request} req - Authenticated request with new content.
 * @param {import("express").Response} res - HTTP response to populate.
 * @returns {Promise<import("express").Response>} The updated note or an error.
 */
const updateArchivedItineraryNote = async (req, res) => {
  try {
    if (typeof req.body?.content !== "string") {
      return res.status(400).json({ message: "Note content must be a string" });
    }

    const result = await getMemberArchivedItinerary(
      req.params.tripId,
      req.user.id,
    );
    if (result?.invalidId) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }
    if (!result) {
      return res.status(404).json({ message: "Archived itinerary not found" });
    }

    const note = await ArchivedItineraryNote.findOneAndUpdate(
      {
        itineraryId: result.itinerary._id,
        authorId: req.user.id,
      },
      { content: req.body.content },
      { new: true, runValidators: true },
    );
    if (!note) {
      return res
        .status(404)
        .json({ message: "Archived itinerary note not found" });
    }

    return res.status(200).json(note);
  } catch (error) {
    return res.status(500).json({
      message: "Error updating archived itinerary note",
      error: error.message,
    });
  }
};

module.exports = {
  getArchivedItineraryNote,
  createArchivedItineraryNote,
  updateArchivedItineraryNote,
};
