const mongoose = require("mongoose");
const { finished } = require("node:stream/promises");

/** Returns the album-only GridFS bucket on the active database connection. */
const getBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
  bucketName: "tripPhotos"
});

/** Writes normalized bytes, aborting partial chunks when the stream fails. */
const upload = async (data, tripId) => {
  const stream = getBucket().openUploadStream("photo.webp", {
    metadata: { trip: String(tripId), contentType: "image/webp" }
  });
  try {
    const completion = finished(stream);
    stream.end(data);
    await completion;
    return stream.id;
  } catch (error) {
    await stream.abort().catch((cleanupError) => console.error("Photo upload abort failed", cleanupError));
    throw error;
  }
};

/** Deletes a file and its chunks; an already-missing file is a successful retry. */
const remove = async (fileId) => {
  const bucket = getBucket();
  // GridFS delete also removes chunks if the files document is absent.
  try {
    await bucket.delete(fileId);
  } catch (error) {
    if (!(error instanceof mongoose.mongo.MongoRuntimeError) ||
        error.message !== `File not found for id ${fileId}`) throw error;
  }
};

const find = async (fileId) => (await getBucket().find({ _id: fileId }).limit(1).toArray())[0];
const download = (fileId) => getBucket().openDownloadStream(fileId);

module.exports = { getBucket, upload, remove, find, download };
