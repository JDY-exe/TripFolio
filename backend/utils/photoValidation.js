const sharp = require("sharp");
const { Worker } = require("node:worker_threads");

const MAX_PHOTO_BYTES = 16 * 1024 * 1024;
const MAX_PHOTO_PIXELS = 60_000_000;

/** An expected client error that is safe to return through the API. */
class PhotoError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Decodes HEIC off the HTTP thread with a bounded lifetime and pixel budget. */
const decodeHeic = (buffer) => new Promise((resolve, reject) => {
  const worker = new Worker(require.resolve("./heicWorker"), {
    workerData: { buffer, maxPixels: MAX_PHOTO_PIXELS }
  });
  const timer = setTimeout(() => {
    worker.terminate();
    reject(new PhotoError("HEIC processing timed out; try a smaller photo"));
  }, 30_000);
  worker.once("message", (result) => {
    clearTimeout(timer);
    worker.terminate();
    if (result.error) reject(new PhotoError(result.error));
    else resolve(result);
  });
  worker.once("error", (error) => { clearTimeout(timer); reject(error); });
  worker.once("exit", (code) => {
    clearTimeout(timer);
    if (code !== 0) reject(new PhotoError("HEIC processing failed"));
  });
});

/**
 * Decodes a supported still photo, applies orientation, and encodes WebP once.
 * Input pixel limits apply before decoding; embedded metadata is not retained.
 * @param {Buffer} buffer - Bounded incoming file contents.
 * @returns {Promise<{data: Buffer, info: object}>} Normalized image and dimensions.
 */
const processPhoto = async (buffer) => {
  if (!buffer?.length) throw new PhotoError("A non-empty image is required");
  if (buffer.length > MAX_PHOTO_BYTES) throw new PhotoError("Photos must not exceed 16 MiB", 413);
  try {
    let image = sharp(buffer, { limitInputPixels: MAX_PHOTO_PIXELS, failOn: "warning" });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp", "heif"].includes(metadata.format) || (metadata.pages || 1) !== 1) {
      throw new PhotoError("Only still JPEG, PNG, HEIC/HEIF, WebP, and AVIF photos are supported");
    }
    if (metadata.format === "heif" && metadata.compression === "hevc") {
      // libheif applies HEIF rotation/mirroring itself; do not apply it twice.
      const { data, width, height } = await decodeHeic(buffer);
      image = sharp(Buffer.from(data), { raw: { width, height, channels: 4 }, limitInputPixels: MAX_PHOTO_PIXELS });
    }
    return await image.rotate()
      .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError("Image is corrupt, unsupported, or exceeds 60 megapixels");
  }
};

module.exports = { MAX_PHOTO_BYTES, MAX_PHOTO_PIXELS, PhotoError, processPhoto };
