const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  getTripInvitations,
  acceptTripInvitation,
  rejectTripInvitation,
  respondToTripInvitation,
	createTrip,
	getTrips,
	getTrip,
	shareTrip,
	shareArchivedTrip,
	updateTripMemberRole,
	updateTripVisibility,
	deleteTrip,
  addUserToTrip,
  getTripFromUser,
	updateTripProfilePicture,
	getTripProfilePicture,
	modifyGlobalVotes,
	hideUserFromTrip,
	archiveTrip,
	getArchivedTrips,
	getArchivedTrip
} = require("../controllers/tripController");
const { MAX_TRIP_PICTURE_SIZE_BYTES } = require("../utils/tripMedia");
const authenticateToken = require("../middleware/authenticateToken");
const essentialsRoutes = require('./essentialsRoutes');
const tripStatsController = require('../controllers/tripStatsController');

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
router.get('/userId=:userId', getTripFromUser);
router.get('/user', getTripFromUser);
router.get('/archived', getArchivedTrips)
router.get('/archived/:id', getArchivedTrip)
router.post('/:id/share', shareTrip);
router.post('/:id/share-archive', shareArchivedTrip);
router.get('/invitations', getTripInvitations);
router.patch('/invitations/:invitationId', respondToTripInvitation);
router.get('/user/invites', getTripInvitations);
router.patch('/:id/invites/accept', acceptTripInvitation);
router.patch('/:id/invites/reject', rejectTripInvitation);
router.patch('/:id/members/:userId/role', updateTripMemberRole);
router.get('/:id', getTrip);
router.patch('/:id/visibility', updateTripVisibility);
router.patch('/:id/profile_picture', parseTripPicture, updateTripProfilePicture);
router.get('/:id/profile_picture', getTripProfilePicture);
router.delete('/:id', deleteTrip);
router.patch('/user', addUserToTrip);
router.patch('/votes', modifyGlobalVotes);
router.patch('/hideUser', hideUserFromTrip);
router.patch('/archive', archiveTrip);
router.use('/:tripId/essentials', essentialsRoutes);
router.get('/:id/stats', authenticateToken, tripStatsController.getTripStats);

module.exports = router;
