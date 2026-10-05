const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const {
  getPublicItinerary,
  getPublicItineraryFeed,
} = require("../controllers/publicItineraryController");

const router = express.Router();

router.use(authenticateToken);
router.get("/feed", getPublicItineraryFeed);
router.get("/:tripId", getPublicItinerary);

module.exports = router;