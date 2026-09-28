const express = require("express");
const router = express.Router();
const itineraryController = require('../controllers/itineraryController');

router.post('/', itineraryController.createItinerary);
router.get('/', itineraryController.getItinerary);
router.patch('/:id', itineraryController.updateItinerary);

module.exports = router;