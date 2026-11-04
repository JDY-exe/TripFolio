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

/** Validates a camera-local EXIF timestamp without inventing a time zone.
 * @param {unknown} value - Raw EXIF DateTimeOriginal or CreateDate value.
 * @returns {string|null} Local ISO timestamp, or null for missing/invalid metadata.
 */
const normalizeCaptureDate = (value) => {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const local = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  const date = new Date(`${local}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== local) return null;
  return local;
};

/** Reads when the camera captured the original image, before normalization strips EXIF.
 * @param {Buffer} buffer - Original uploaded image bytes.
 * @returns {Promise<string|null>} Camera-local capture time; never an upload or modification time.
 */
const extractPhotoTakenAt = async (buffer) => {
  try {
    const metadata = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "CreateDate"],
      reviveValues: false,
    });
    return normalizeCaptureDate(metadata?.DateTimeOriginal) || normalizeCaptureDate(metadata?.CreateDate);
  } catch {
    return null;
  }
};

module.exports = { extractPhotoLocation, extractPhotoTakenAt, normalizeCaptureDate };