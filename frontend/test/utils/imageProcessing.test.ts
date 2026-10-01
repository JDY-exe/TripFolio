import imageCompression from 'browser-image-compression';
import { describe, expect, it, vi } from 'vitest';
import {
  imageFileToDataUrl,
  MAX_IMAGE_SOURCE_SIZE_BYTES,
  validateImageUpload,
} from '../../src/utils/imageProcessing';

vi.mock('browser-image-compression', () => ({
  default: Object.assign(vi.fn(), { getDataUrlFromFile: vi.fn() }),
}));

describe('validateImageUpload', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts %s at the 16 MB source limit',
    (type) => {
      expect(
        validateImageUpload({ type, size: MAX_IMAGE_SOURCE_SIZE_BYTES }),
      ).toBeUndefined();
    },
  );

  it('rejects unsupported, empty, and oversized sources', () => {
    expect(validateImageUpload({ type: 'image/svg+xml', size: 1024 })).toBe(
      'Choose a JPEG, PNG, or WebP image.',
    );
    expect(validateImageUpload({ type: 'image/jpeg', size: 0 })).toBe(
      'Choose a nonempty image no larger than 16 MB.',
    );
    expect(
      validateImageUpload({
        type: 'image/jpeg',
        size: MAX_IMAGE_SOURCE_SIZE_BYTES + 1,
      }),
    ).toBe('Choose a nonempty image no larger than 16 MB.');
  });
});

describe('imageFileToDataUrl', () => {
  const file = new File(['profile'], 'profile.jpg', { type: 'image/jpeg' });

  it('accepts a data URL at the backend character limit', async () => {
    const dataUrl = 'x'.repeat(90_000);
    vi.mocked(imageCompression.getDataUrlFromFile).mockResolvedValue(dataUrl);

    await expect(imageFileToDataUrl(file)).resolves.toBe(dataUrl);
  });

  it('rejects a data URL over the backend character limit', async () => {
    vi.mocked(imageCompression.getDataUrlFromFile).mockResolvedValue(
      'x'.repeat(90_001),
    );

    await expect(imageFileToDataUrl(file)).rejects.toThrow('too large');
  });
});
