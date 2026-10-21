const assert = require("node:assert/strict");
const test = require("node:test");
const {
  MAX_TRIP_PICTURE_SIZE_BYTES,
  validateTripProfilePicture
} = require("../utils/tripMedia");

test("accepts JPEG and PNG pictures within the size limit", () => {
  assert.equal(
    validateTripProfilePicture({ mimetype: "image/jpeg", size: 1024 }),
    undefined
  );
  assert.equal(
    validateTripProfilePicture({ mimetype: "image/png", size: MAX_TRIP_PICTURE_SIZE_BYTES }),
    undefined
  );
});

test("rejects missing and unsupported picture files", () => {
  assert.equal(validateTripProfilePicture(undefined), "A trip image is required");
  assert.equal(
    validateTripProfilePicture({ mimetype: "application/pdf", size: 1024 }),
    "Only JPEG and PNG images are supported"
  );
});

test("rejects pictures larger than 16 MB", () => {
  assert.equal(
    validateTripProfilePicture({
      mimetype: "image/jpeg",
      size: MAX_TRIP_PICTURE_SIZE_BYTES + 1
    }),
    "Trip images must be no larger than 16 MB"
  );
});