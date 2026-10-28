const sharp = require("sharp");

const MAX_PHOTO_BYTES = 16 * 1024 * 1024;
const MAX_PHOTO_PIXELS = 40_000_000;

/** An expected client error that is safe to return through the API. */
class PhotoError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Decodes a JPEG/PNG, applies orientation, and encodes WebP exactly once.
 * Input pixel limits apply before decoding; embedded metadata is not retained.
 * @param {Buffer} buffer - Bounded incoming file contents.
 * @returns {Promise<{data: Buffer, info: object}>} Normalized image and dimensions.
 */
const processPhoto = async (buffer) => {
  if (!buffer?.length) throw new PhotoError("A non-empty image is required");
  if (buffer.length > MAX_PHOTO_BYTES) throw new PhotoError("Photos must not exceed 16 MiB", 413);
  try {
    const image = sharp(buffer, { limitInputPixels: MAX_PHOTO_PIXELS, failOn: "warning" });
    const metadata = await image.metadata();
    if (!["jpeg", "png"].includes(metadata.format) || (metadata.pages || 1) !== 1) {
      throw new PhotoError("Only single-frame JPEG and PNG images are supported");
    }
    return await image.rotate()
      .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError("Image is corrupt, unsupported, or exceeds 40 megapixels");
  }
};

module.exports = { MAX_PHOTO_BYTES, MAX_PHOTO_PIXELS, PhotoError, processPhoto };
