const express = require('express');
const router = express.Router();
const destinationController = require('../controllers/destinationController');
const authenticateToken = require('../middleware/authenticateToken');

router.use(authenticateToken);

router.get('/', destinationController.getDestinations);

module.exports = router;
