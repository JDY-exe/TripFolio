import { describe, expect, it } from 'vitest';
import {
  PHOTO_ACCEPT,
  MAX_PHOTO_BYTES,
  validatePhotoUpload,
} from '../../src/utils/photoUpload';
import { isMediaUploadFileAccepted } from '../../src/components/common/MediaUpload/mediaUploadConfig';

describe('album photo selection', () => {
  it.each(['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'avif'])(
    'accepts .%s even when a phone supplies no MIME type',
    (extension) => {
      expect(
        isMediaUploadFileAccepted(
          { name: `PHOTO.${extension.toUpperCase()}`, type: '' },
          'image',
          PHOTO_ACCEPT,
        ),
      ).toBe(true);
    },
  );
  it.each(['image/heic', 'image/heif', 'image/webp', 'image/avif'])(
    'accepts %s from picker and drop',
    (type) => {
      expect(
        isMediaUploadFileAccepted(
          { name: 'photo', type },
          'image',
          PHOTO_ACCEPT,
        ),
      ).toBe(true);
    },
  );
  it.each(['photo.gif', 'photo.dng', 'photo.svg', 'photo.tiff'])(
    'excludes unsupported %s',
    (name) => {
      expect(
        isMediaUploadFileAccepted({ name, type: '' }, 'image', PHOTO_ACCEPT),
      ).toBe(false);
    },
  );
  it('checks size without trying to decode HEIC in the browser', () => {
    expect(
      validatePhotoUpload(new File(['photo'], 'photo.heic')),
    ).toBeUndefined();
    expect(validatePhotoUpload(new File([], 'empty.heic'))).toMatch(
      /non-empty/,
    );
    expect(
      validatePhotoUpload(
        new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'large.heic'),
      ),
    ).toMatch(/16 MiB/);
  });
});
