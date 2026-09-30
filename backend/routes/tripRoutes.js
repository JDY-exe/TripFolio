const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
	createTrip,
	getTrips,
	deleteTrip,
  addUserToTrip,
  getTripFromUser,
	updateTripProfilePicture,
	getTripProfilePicture
} = require("../controllers/tripController");
const { MAX_TRIP_PICTURE_SIZE_BYTES } = require("../utils/tripMedia");
const authenticateToken = require("../middleware/authenticateToken");

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_TRIP_PICTURE_SIZE_BYTES }
});

const parseTripPicture = (req, res, next) => {
	upload.single("image")(req, res, (error) => {
		if (error instanceof multer.MulterError) {
			const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
			return res.status(status).json({ message: "Trip image upload was rejected" });
		}
		if (error) {
			return res.status(400).json({ message: "Invalid trip image upload" });
		}
		return next();
	});
};

router.use(authenticateToken);

router.post('/', createTrip);
router.get('/', getTrips);
router.patch('/:id/profile_picture', parseTripPicture, updateTripProfilePicture);
router.get('/:id/profile_picture', getTripProfilePicture);
router.delete('/:id', deleteTrip);
router.get('/userId=:userId', getTripFromUser);
router.patch('/user', addUserToTrip);

module.exports = router;
