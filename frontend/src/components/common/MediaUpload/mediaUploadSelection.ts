import { displayAlert } from '../Toast';

/**
 * Announces each selected filename through the shared toast API. Only the name
 * property is inspected, so file bytes are neither read nor retained.
 *
 * @param files - Browser files, or file-like values containing a name.
 * @returns Nothing; one informational alert is queued for every filename.
 */
export function announceMediaUploadFiles(files: Iterable<Pick<File, 'name'>>) {
  Array.from(files).forEach((file) => displayAlert(file.name));
}
