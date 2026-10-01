import imageCompression from 'browser-image-compression';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cropAndCompressImage,
  imageFileToDataUrl,
  MAX_IMAGE_SOURCE_SIZE_BYTES,
  profileImagePreset,
  tripCoverImagePreset,
  validateImageUpload,
} from '../../../src/components/common/ImageUpload/imageProcessing';

vi.mock('browser-image-compression', () => {
  const compress = Object.assign(vi.fn(), {
    getDataUrlFromFile: vi.fn(),
  });
  return { default: compress };
});

describe('validateImageUpload', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts %s within the source limit',
    (type) => {
      expect(validateImageUpload({ type, size: 1024 })).toBeUndefined();
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

describe('cropAndCompressImage', () => {
  const drawImage = vi.fn();
  const closeBitmap = vi.fn();
  const canvas = {
    getContext: vi.fn(() => ({ drawImage })),
    height: 0,
    toBlob: (callback: BlobCallback) =>
      callback(new Blob(['cropped'], { type: 'image/jpeg' })),
    width: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    canvas.width = 0;
    canvas.height = 0;
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ close: closeBitmap }),
    );
    vi.stubGlobal('document', {
      createElement: vi.fn(() => canvas),
    });
    vi.mocked(imageCompression).mockImplementation(async (file) => file);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['profile', profileImagePreset, 384, 384],
    ['trip cover', tripCoverImagePreset, 1600, 900],
  ] as const)(
    'renders the selected pixels at the %s preset dimensions',
    async (_name, preset, width, height) => {
      const file = new File(['source'], 'holiday.png', { type: 'image/png' });
      const result = await cropAndCompressImage(
        file,
        { x: 120, y: 45, width: 800, height: 450 },
        preset,
      );

      expect(canvas.width).toBe(width);
      expect(canvas.height).toBe(height);
      expect(drawImage).toHaveBeenCalledWith(
        expect.anything(),
        120,
        45,
        800,
        450,
        0,
        0,
        width,
        height,
      );
      expect(result.name).toBe('holiday.jpg');
      expect(result.type).toBe('image/jpeg');
      expect(imageCompression).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'image/jpeg' }),
        expect.objectContaining({
          fileType: 'image/jpeg',
          maxSizeMB: preset.maxOutputSizeMb,
        }),
      );
      expect(closeBitmap).toHaveBeenCalledOnce();
    },
  );
});

describe('imageFileToDataUrl', () => {
  it('returns profile image data within the API limit', async () => {
    const file = new File(['profile'], 'profile.jpg', { type: 'image/jpeg' });
    vi.mocked(imageCompression.getDataUrlFromFile).mockResolvedValue(
      'data:image/jpeg;base64,profile',
    );

    await expect(imageFileToDataUrl(file)).resolves.toBe(
      'data:image/jpeg;base64,profile',
    );
  });

  it('rejects encoded profile data over the API limit', async () => {
    const file = new File(['profile'], 'profile.jpg', { type: 'image/jpeg' });
    vi.mocked(imageCompression.getDataUrlFromFile).mockResolvedValue(
      'x'.repeat(90_001),
    );

    await expect(imageFileToDataUrl(file)).rejects.toThrow('too large');
  });
});
