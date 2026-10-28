const { parentPort, workerData } = require("node:worker_threads");
const decode = require("heic-decode");

/** Inspects HEIF dimensions before allocating RGBA pixels, then decodes one still. */
const run = async () => {
  const images = await decode.all({ buffer: Buffer.from(workerData.buffer) });
  try {
    if (images.length !== 1) throw new Error("Only single-frame photos are supported");
    const { width, height } = images[0];
    if (width * height > workerData.maxPixels) throw new Error("Photo exceeds 60 megapixels");
    const image = await images[0].decode();
    parentPort.postMessage({ width, height, data: image.data });
  } finally {
    images.dispose();
  }
};

run().catch((error) => parentPort.postMessage({ error: error.message }));
