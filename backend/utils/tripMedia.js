const MAX_TRIP_PICTURE_SIZE_BYTES = 16 * 1024 * 1024;
const SUPPORTED_TRIP_PICTURE_TYPES = new Set(["image/jpeg", "image/png"]);

/**
 * Validates the MIME type and size of an uploaded trip picture.
 * @param {object | undefined} file - Uploaded file metadata from Multer.
 * @returns {string | undefined} A validation message, or undefined when valid.
 */
function validateTripProfilePicture(file) {
  if (!file) {
    return "A trip image is required";
  }
  if (!SUPPORTED_TRIP_PICTURE_TYPES.has(file.mimetype)) {
    return "Only JPEG and PNG images are supported";
  }
  if (file.size > MAX_TRIP_PICTURE_SIZE_BYTES) {
    return "Trip images must be no larger than 16 MB";
  }
  return undefined;
}

module.exports = {
  MAX_TRIP_PICTURE_SIZE_BYTES,
  validateTripProfilePicture
};