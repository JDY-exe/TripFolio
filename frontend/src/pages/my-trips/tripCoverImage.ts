import imageCompression from 'browser-image-compression';

export const MAX_TRIP_COVER_SIZE_BYTES = 16 * 1024 * 1024;

const supportedTripCoverTypes = new Set(['image/jpeg', 'image/png']);

/**
 * Checks whether a selected trip cover meets the supported type and size rules.
 *
 * @param file - File metadata from the native image picker.
 * @returns A validation message, or undefined when the image is accepted.
 */
export function validateTripCoverImage(
  file: Pick<File, 'type' | 'size'>,
): string | undefined {
  if (!supportedTripCoverTypes.has(file.type)) {
    return 'Choose a JPEG or PNG image.';
  }

  if (file.size > MAX_TRIP_COVER_SIZE_BYTES) {
    return 'Choose an image no larger than 16 MB.';
  }

  return undefined;
}

/**
 * Resizes and compresses a valid trip cover in the browser before upload.
 *
 * @param file - JPEG or PNG image selected for the trip cover.
 * @returns The compressed image file, preserving its original file type.
 */
export function compressTripCoverImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  });
}
