const mongoose = require("mongoose");
const Event = require("../models/event");
const Friendship = require("../models/Friendship");
const Itinerary = require("../models/itinerary");
const Trip = require("../models/trip");
const User = require("../models/User");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 20;

/**
 * Fetches one page of public itineraries, ranking friends before other authors.
 * MongoDB filters and paginates the joined trip/itinerary records so private
 * trips and trips without itineraries never enter the response.
 *
 * @param {import("express").Request} req - Authenticated feed request.
 * @param {import("express").Response} res - HTTP response to populate.
 * @returns {Promise<import("express").Response>} Paginated public itinerary records.
 */
const getPublicItineraryFeed = async (req, res) => {
  try {
    const page = Number(req.query.page ?? 0);
    const requestedPageSize = Number(req.query.limit ?? DEFAULT_PAGE_SIZE);
    if (
      !Number.isSafeInteger(page) ||
      page < 0 ||
      !Number.isSafeInteger(requestedPageSize) ||
      requestedPageSize < 1
    ) {
      return res.status(400).json({ message: "Invalid feed pagination" });
    }

    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
    const userId = req.user.id;
    const [user, friendships] = await Promise.all([
      User.findById(userId).select("friends"),
      Friendship.find({
        status: "accepted",
        $or: [{ requester: userId }, { recipient: userId }],
      }),
    ]);
    if (!user) {
      return res.status(401).json({ message: "Authenticated user no longer exists" });
    }

    const friendIds = new Set((user.friends || []).map(String));
    for (const friendship of friendships) {
      const friendId = String(friendship.requester) === String(userId)
        ? friendship.recipient
        : friendship.requester;
      if (String(friendId) !== String(userId)) friendIds.add(String(friendId));
    }

    const friendObjectIds = [...friendIds]
      .filter(mongoose.isValidObjectId)
      .map((id) => new mongoose.Types.ObjectId(id));
    const [records] = await Promise.all([
      Trip.aggregate([
        { $match: { isPublic: true } },
        {
          $lookup: {
            from: "itineraries",
            localField: "_id",
            foreignField: "tripId",
            as: "itinerary",
          },
        },
        { $unwind: "$itinerary" },
        {
          $lookup: {
            from: "users",
            localField: "ownerId",
            foreignField: "_id",
            pipeline: [{ $project: { username: 1, profile_picture: 1 } }],
            as: "owner",
          },
        },
        { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
        { $addFields: { isFriend: { $in: ["$ownerId", friendObjectIds] } } },
        { $sort: { isFriend: -1, "itinerary.createdAt": -1, _id: 1 } },
        { $skip: page * pageSize },
        { $limit: pageSize + 1 },
        {
          $lookup: {
            from: "events",
            let: { itineraryId: "$itinerary._id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$itineraryID", "$$itineraryId"] } } },
              { $limit: 1 },
            ],
            as: "itineraryEvents",
          },
        },
        {
          $project: {
            _id: 0,
            tripId: "$_id",
            tripName: "$name",
            tripStartDate: "$startDate",
            tripEndDate: "$endDate",
            isFriend: 1,
            createdAt: "$itinerary.createdAt",
            owner: {
              id: "$owner._id",
              username: "$owner.username",
              profile_picture: "$owner.profile_picture",
            },
            itinerary: {
              _id: "$itinerary._id",
              title: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$itinerary.title", "Blank Itinerary"] },
                      {
                        $or: [
                          { $gt: [{ $size: "$itineraryEvents" }, 0] },
                          {
                            $ne: [
                              {
                                $trim: {
                                  input: { $ifNull: ["$itinerary.description", ""] },
                                },
                              },
                              "",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  "",
                  "$itinerary.title",
                ],
              },
              description: "$itinerary.description",
              startDate: "$itinerary.startDate",
              endDate: "$itinerary.endDate",
            },
          },
        },
      ]),
    ]);

    const hasMore = records.length > pageSize;
    return res.status(200).json({
      items: hasMore ? records.slice(0, pageSize) : records,
      nextPage: hasMore ? page + 1 : null,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching public itineraries", error: error.message });
  }
};

/**
 * Returns one public trip's itinerary and events without exposing private trip
 * fields or creating a blank itinerary as the member-only endpoint does.
 *
 * @param {import("express").Request} req - Authenticated public detail request.
 * @param {import("express").Response} res - HTTP response to populate.
 * @returns {Promise<import("express").Response>} Public itinerary details or 404.
 */
const getPublicItinerary = async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await Trip.findById(tripId);
    if (!trip || !trip.isPublic) {
      return res.status(404).json({ message: "Public itinerary not found" });
    }

    const itinerary = await Itinerary.findOne({ tripId: trip._id });
    if (!itinerary) {
      return res.status(404).json({ message: "Public itinerary not found" });
    }

    const [owner, events] = await Promise.all([
      User.findById(trip.ownerId).select("username profile_picture"),
      Event.find({ itineraryID: itinerary._id }).sort({ startTime: 1 }),
    ]);

    return res.status(200).json({
      trip: {
        _id: trip._id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      owner: owner
        ? {
            id: owner._id,
            username: owner.username,
            profile_picture: owner.profile_picture,
          }
        : null,
      itinerary,
      events,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching public itinerary", error: error.message });
  }
};

module.exports = { getPublicItineraryFeed, getPublicItinerary };