const express = require("express");
const router = express.Router();
const { createTrip, getTrips, deleteTrip, addUserToTrip, getTripFromUser } = require("../controllers/tripController");

router.post('/', createTrip);
router.get('/', getTrips);
router.delete('/:id', deleteTrip);
router.get('/userId=:userId', getTripFromUser);
router.patch('/user', addUserToTrip);

module.exports = router;