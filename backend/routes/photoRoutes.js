
const express = require("express");
const router = express.Router();

const Photo = require("../models/photo");
const Trip = require("../models/Trip");
const authenticateToken = require("../middleware/authenticateToken");


router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            photoString,
            linkEvent,
            metadata,
            trip
        } = req.body;
        if (!photoString || typeof photoString !== "string") {
            return res.status(400).json({
                message: "photoString is required"
            });
        }
        if (!trip) {
            return res.status(400).json({
                message: "trip is required"
            });
        }

        const tripDoc = await Trip.findById(trip);

        if (!tripDoc) {
            return res.status(404).json({
                message: "Trip not found"
            });
        }

        const userId = req.user.id;
        const isTripMember = tripDoc.users.some(
            user => user.toString() === userId.toString()
        );

        if (!isTripMember) {
            return res.status(403).json({
                message: "You do not have access to this trip"
            });
        }

        const location = metadata?.location;

        if (location) {
            const { latitude, longitude } = location;

            if (
                latitude != null &&
                (!Number.isFinite(latitude) ||
                    latitude < -90 ||
                    latitude > 90)
            ) {
                return res.status(400).json({
                    message: "Invalid latitude"
                });
            }

            if (
                longitude != null &&
                (!Number.isFinite(longitude) ||
                    longitude < -180 ||
                    longitude > 180)
            ) {
                return res.status(400).json({
                    message: "Invalid longitude"
                });
            }
        }

        const photo = await Photo.create({
            photoString,
            linkEvent: linkEvent || null,
            metadata: metadata || {},
            trip: tripDoc._id
        });

        return res.status(201).json({
            message: "Photo created successfully",
            photo
        });
    } catch (error) {
        console.error("Error creating photo:", error);

        return res.status(500).json({
            message: "Failed to create photo"
        });
    }
});

router.get("/:tripId", authenticateToken, async (req, res) => {
    try {
        const { tripId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(tripId)) {
            return res.status(400).json({
                message: "Invalid trip ID"
            });
        }

        const tripDoc = await Trip.findById(tripId);

        if (!tripDoc) {
            return res.status(404).json({
                message: "Trip not found"
            });
        }

        const userId = req.user.id;

        const isTripMember = tripDoc.users.some(
            user => user.toString() === userId.toString()
        );

        if (!isTripMember) {
            return res.status(403).json({
                message: "You do not have access to this trip"
            });
        }

        const photos = await Photo.find({
            trip: tripId
        }).populate("linkEvent");

        return res.status(200).json({
            message: "Photos retrieved successfully",
            photos
        });
    } catch (error) {
        console.error("Error retrieving photos:", error);

        return res.status(500).json({
            message: "Failed to retrieve photos"
        });
    }
});

module.exports = router;
