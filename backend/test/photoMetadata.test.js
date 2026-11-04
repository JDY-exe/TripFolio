const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { normalizeCaptureDate, extractPhotoTakenAt } = require('../utils/photoMetadata');

test('capture dates preserve camera-local days, not the server timezone', () => {
  assert.equal(normalizeCaptureDate('2026:05:12 23:30:00'), '2026-05-12T23:30:00');
  assert.equal(normalizeCaptureDate('2026-05-12T23:30:00-05:00'), '2026-05-12T23:30:00');
  assert.equal(normalizeCaptureDate('2024:02:29 00:00:00'), '2024-02-29T00:00:00');
  for (const value of [null, undefined, '', 'bad', '2026:02:29 12:00:00', '2026:13:01 00:00:00', '2026:05:12 24:00:00', '0000:00:00 00:00:00']) {
    assert.equal(normalizeCaptureDate(value), null);
  }
});

test('original image EXIF supplies capture time, never file modification time', async () => {
  const image = sharp({ create: { width: 2, height: 2, channels: 3, background: 'blue' } });
  const original = await image.clone().jpeg().withExif({
    IFD0: { DateTime: '2026:11:01 10:00:00' },
    IFD2: { DateTimeOriginal: '2026:05:12 23:30:00', DateTimeDigitized: '2026:05:13 00:00:00' },
  }).toBuffer();
  assert.equal(await extractPhotoTakenAt(original), '2026-05-12T23:30:00');
  const digitized = await image.clone().jpeg().withExif({ IFD2: { DateTimeDigitized: '2026:05:13 00:00:00' } }).toBuffer();
  assert.equal(await extractPhotoTakenAt(digitized), '2026-05-13T00:00:00');
  const modified = await image.clone().jpeg().withExif({ IFD0: { DateTime: '2026:11:01 10:00:00' } }).toBuffer();
  assert.equal(await extractPhotoTakenAt(modified), null);
  assert.equal(await extractPhotoTakenAt(await image.clone().png().toBuffer()), null);
  assert.equal(await extractPhotoTakenAt(Buffer.from('corrupt photo')), null);
});
