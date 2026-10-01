import imageCompression from 'browser-image-compression';

export const MAX_IMAGE_SOURCE_SIZE_BYTES = 16 * 1024 * 1024;
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
// The backend /users/profile_picture route caps the encoded data URL at 90,000 characters.
const MAX_PROFILE_PICTURE_DATA_URL_LENGTH = 90_000;

export interface ImageCropArea {
  /** Horizontal crop offset in source-image pixels. */
  x: number;
  /** Vertical crop offset in source-image pixels. */
  y: number;
  /** Crop width in source-image pixels. */
  width: number;
  /** Crop height in source-image pixels. */
  height: number;
}

export interface ImageUploadPreset {
  /** Fixed width-to-height ratio shown by the crop guide. */
  aspect: number;
  /** Visual crop-guide shape. The exported file remains rectangular. */
  cropShape: 'rect' | 'round';
  /** Final image width in pixels before size compression. */
  outputWidth: number;
  /** Final image height in pixels before size compression. */
  outputHeight: number;
  /** Maximum compressed file size in megabytes. */
  maxOutputSizeMb: number;
}

/** Square avatar preset compatible with the current profile data-URL API. */
export const profileImagePreset: ImageUploadPreset = {
  aspect: 1,
  cropShape: 'round',
  outputWidth: 384,
  outputHeight: 384,
  maxOutputSizeMb: 0.04,
};

/** Widescreen cover preset matching trip-card presentation. */
export const tripCoverImagePreset: ImageUploadPreset = {
  aspect: 16 / 9,
  cropShape: 'rect',
  outputWidth: 1600,
  outputHeight: 900,
  maxOutputSizeMb: 2,
};

/**
 * Validates a source image before opening the crop editor.
 *
 * @param file - Browser-selected image metadata.
 * @returns A user-facing validation message, or undefined when accepted.
 */
export const validateImageUpload = (
  file: Pick<File, 'type' | 'size'>,
): string | undefined => {
  if (!supportedImageTypes.has(file.type)) {
    return 'Choose a JPEG, PNG, or WebP image.';
  }

  if (file.size === 0 || file.size > MAX_IMAGE_SOURCE_SIZE_BYTES) {
    return 'Choose a nonempty image no larger than 16 MB.';
  }

  return undefined;
};

/**
 * Renders the chosen crop into the preset dimensions and compresses the JPEG.
 * Canvas rendering performs the crop and resize in one pass before the existing
 * compression library enforces the destination's byte-size budget.
 *
 * @param file - Valid source image selected by the user.
 * @param crop - Pixel crop returned by the interactive cropper.
 * @param preset - Destination dimensions, aspect, and size ceiling.
 * @returns The processed JPEG ready for preview or upload.
 */
export const cropAndCompressImage = async (
  file: File,
  crop: ImageCropArea,
  preset: ImageUploadPreset,
): Promise<File> => {
  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = preset.outputWidth;
    canvas.height = preset.outputHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare this picture.');

    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      preset.outputWidth,
      preset.outputHeight,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error('Unable to prepare this picture.')),
        'image/jpeg',
        0.92,
      );
    });
    const croppedFile = new File([blob], replaceFileExtension(file.name), {
      type: 'image/jpeg',
    });

    return imageCompression(croppedFile, {
      fileType: 'image/jpeg',
      maxSizeMB: preset.maxOutputSizeMb,
      maxWidthOrHeight: Math.max(preset.outputWidth, preset.outputHeight),
      useWebWorker: true,
    });
  } finally {
    bitmap.close();
  }
};

/**
 * Reads a processed file as a data URL for the existing profile API contract.
 *
 * @param file - Processed image file to encode.
 * @returns The complete browser data URL.
 */
export const imageFileToDataUrl = async (file: File): Promise<string> => {
  const dataUrl = await imageCompression.getDataUrlFromFile(file);
  if (dataUrl.length > MAX_PROFILE_PICTURE_DATA_URL_LENGTH) {
    throw new Error('This image is too large. Choose a smaller picture.');
  }
  return dataUrl;
};

/**
 * Replaces a source filename extension with JPEG for the processed output.
 *
 * @param filename - Original browser-provided filename.
 * @returns A filename ending in `.jpg`.
 */
const replaceFileExtension = (filename: string): string => {
  const basename = filename.replace(/\.[^/.]+$/, '') || 'image';
  return `${basename}.jpg`;
};
