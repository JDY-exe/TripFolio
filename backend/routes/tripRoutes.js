const express = require("express");
const router = express.Router();
const { createTrip, getTrips } = require("../controllers/tripController");

router.post("/", createTrip);
router.get("/", getTrips);

module.export = router;