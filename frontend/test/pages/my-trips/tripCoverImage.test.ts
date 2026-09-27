import { describe, expect, it } from 'vitest';
import {
  MAX_TRIP_COVER_SIZE_BYTES,
  validateTripCoverImage,
} from '../../../src/pages/my-trips/tripCoverImage';

describe('validateTripCoverImage', () => {
  it.each(['image/jpeg', 'image/png'])(
    'accepts %s images within the limit',
    (type) => {
      expect(validateTripCoverImage({ type, size: 1024 })).toBeUndefined();
    },
  );

  it('rejects unsupported file types', () => {
    expect(
      validateTripCoverImage({ type: 'application/pdf', size: 1024 }),
    ).toBe('Choose a JPEG or PNG image.');
  });

  it('accepts a file at the size limit', () => {
    expect(
      validateTripCoverImage({
        type: 'image/png',
        size: MAX_TRIP_COVER_SIZE_BYTES,
      }),
    ).toBeUndefined();
  });

  it('rejects files larger than the size limit', () => {
    expect(
      validateTripCoverImage({
        type: 'image/jpeg',
        size: MAX_TRIP_COVER_SIZE_BYTES + 1,
      }),
    ).toBe('Choose an image no larger than 16 MB.');
  });
});
