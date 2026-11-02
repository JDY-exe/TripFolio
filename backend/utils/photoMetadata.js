const exifr = require("exifr");

/**
 * Extracts GPS information from an uploaded image.
 * @param {Buffer} buffer - Original uploaded image.
 * @returns {Promise<Object|null>} GPS information or null.
 */
const extractPhotoLocation = async (buffer) => {
  try {
    const gps = await exifr.gps(buffer);

    if (
      !gps ||
      !Number.isFinite(gps.latitude) ||
      !Number.isFinite(gps.longitude)
    ) {
      return null;
    }

    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
      altitude: null
    };
  } catch (error) {
    // Missing or unsupported EXIF metadata should not prevent uploading.
    return null;
  }
};

module.exports = { extractPhotoLocation };