const express = require("express");
const router = express.Router();
const itineraryController = require('../controllers/itineraryController');
const archivedItineraryNoteController = require('../controllers/archivedItineraryNoteController');
const authenticateToken = require('../middleware/authenticateToken');

router.use(authenticateToken);

router.post('/', itineraryController.createItinerary);
router.get('/', itineraryController.getItinerary);
router.patch('/:id', itineraryController.updateItinerary);
router.get('/:tripId/notes', archivedItineraryNoteController.getArchivedItineraryNote);
router.post('/:tripId/notes', archivedItineraryNoteController.createArchivedItineraryNote);
router.patch('/:tripId/notes', archivedItineraryNoteController.updateArchivedItineraryNote);

module.exports = router;
