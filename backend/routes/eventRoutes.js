const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { getEventLocation } = require("../controllers/eventLocationController");
const authenticateToken = require("../middleware/authenticateToken");

router.use(authenticateToken);

router.post("/", eventController.createEvent);
router.get("/", eventController.getEvents);
router.get("/:id/photo", eventController.getEventPhoto);
router.get("/:id/location", getEventLocation);
router.patch("/:id", eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

module.exports = router;
