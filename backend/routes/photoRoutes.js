const express = require("express");
const multer = require("multer");
const authenticateToken = require("../middleware/authenticateToken");
const { MAX_PHOTO_BYTES, PhotoError } = require("../utils/photoValidation");
const { authorizePhoto, uploadPhoto, listPhotos, getPhotoContent, deletePhoto } = require("../controllers/photoController");

const router = express.Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0, parts: 1, headerPairs: 50 }
});

// Bound the entire buffered-upload/processing lifecycle, not just Sharp's workers.
// There is no unbounded in-memory queue; callers retry a busy server later.
let activeUploads = 0;
const reserveUpload = (req, res, next) => {
  if (activeUploads >= 2) {
    res.set("Retry-After", "5");
    return next(new PhotoError("Photo uploads are busy; retry shortly", 503));
  }
  activeUploads += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeUploads -= 1;
  };
  // Release in the handler's finally block even if the client disconnects early.
  req.releasePhotoUpload = release;
  next();
};

const parsePhoto = (req, res, next) => upload.single("image")(req, res, (error) => {
  if (error) {
    req.releasePhotoUpload();
    if (error instanceof multer.MulterError) {
      return next(new PhotoError(
        error.code === "LIMIT_FILE_SIZE" ? "Photos must not exceed 16 MiB" : "Send exactly one image file and no additional fields",
        error.code === "LIMIT_FILE_SIZE" ? 413 : 400
      ));
    }
    return next(new PhotoError("Invalid multipart image upload"));
  }
  next();
});

router.use(authenticateToken);
router.post("/", authorizePhoto(true), reserveUpload, parsePhoto, async (req, res, next) => {
  try {
    await uploadPhoto(req, res, next);
  } finally {
    req.releasePhotoUpload();
  }
});
router.get("/", authorizePhoto(), listPhotos);
router.get("/:photoId/content", authorizePhoto(), getPhotoContent);
router.delete("/:photoId", authorizePhoto(true), deletePhoto);
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!(error instanceof PhotoError)) console.error("Photo request failed", error);
  res.status(error instanceof PhotoError ? error.status : 500).json({
    message: error instanceof PhotoError ? error.message : "Photo operation failed"
  });
});

module.exports = router;
