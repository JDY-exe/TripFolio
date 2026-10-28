const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { processPhoto, MAX_PHOTO_BYTES } = require("../utils/photoValidation");

const image = (width, height) => sharp({ create: { width, height, channels: 3, background: "red" } });

test("normalizes JPEG once to bounded WebP and strips EXIF", async () => {
  const input = await image(3000, 1500).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const { data, info } = await processPhoto(input);
  assert.equal(info.format, "webp");
  assert.equal(info.width, 1280);
  assert.equal(info.height, 2560);
  const metadata = await sharp(data).metadata();
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
});

test("PNG transparency is preserved and small images are not enlarged", async () => {
  const input = await sharp({ create: { width: 32, height: 16, channels: 4, background: "transparent" } }).png().toBuffer();
  const { data, info } = await processPhoto(input);
  assert.equal(info.width, 32);
  assert.equal(info.height, 16);
  assert.equal((await sharp(data).metadata()).hasAlpha, true);
});

test("rejects empty, corrupt, oversized, unsupported, and excessive-pixel inputs", async () => {
  await assert.rejects(processPhoto(), /non-empty/);
  await assert.rejects(processPhoto(Buffer.from("not an image")), /corrupt/);
  await assert.rejects(processPhoto(Buffer.alloc(MAX_PHOTO_BYTES + 1)), (error) => error.status === 413);
  await assert.rejects(processPhoto(await image(8, 8).webp().toBuffer()), /JPEG and PNG/);
  await assert.rejects(processPhoto(await image(6400, 6400).png().toBuffer()), /40 megapixels/);
});
