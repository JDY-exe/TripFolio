export const MAX_PHOTO_BYTES = 16 * 1024 * 1024;
export const PHOTO_ACCEPT =
  'image/jpeg,image/png,image/heic,image/heif,image/webp,image/avif,.jpg,.jpeg,.png,.heic,.heif,.webp,.avif';

/**
 * Checks basic album upload limits without decoding phone formats in the browser.
 * The server verifies actual contents and enforces the 60 MP decode limit.
 * @param file - Selected photo.
 * @returns A recoverable validation message, or undefined for an eligible file.
 */
export const validatePhotoUpload = (file: File): string | undefined => {
  if (file.size === 0) return 'Choose a non-empty photo.';
  if (file.size > MAX_PHOTO_BYTES) return 'Photos must not exceed 16 MiB.';
  return undefined;
};
