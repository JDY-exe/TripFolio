/** Checks whether this secure browser can hand the prepared image file to native apps.
 * @param file - Exact currently previewed image; no fetch occurs during the share click.
 * @returns Whether the native file-sharing action should be offered.
 */
export const canShareImage = (file: File): boolean => {
  try {
    return (
      window.isSecureContext &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
};

/** Downloads the exact previewed file, allowing time for the browser to consume its URL.
 * @param file - Prepared JPEG with a safe, generated filename.
 * @returns Nothing; initiates an explicit user-requested browser download.
 */
export const downloadImage = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/** Opens native sharing immediately so the click's transient user activation is retained.
 * @param file - JPEG already prepared by the renderer.
 * @returns A promise resolving on handoff or cancellation, not proof of publication.
 */
export const shareImage = async (file: File): Promise<void> => {
  try {
    await navigator.share({ files: [file] });
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) throw error;
  }
};
