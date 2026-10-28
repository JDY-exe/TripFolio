import axios from 'axios';
import { deleteFromApi } from './api';

const MAX_DELETE_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;

/** Deletes one photo, retrying transient failures with bounded exponential backoff.
 * DELETE is idempotent, so retrying also completes server-side deletion tombstones
 * or safely confirms a deletion whose successful response was lost.
 * @param url - Protected photo deletion endpoint.
 * @param signal - Cancels requests and prevents retries after leaving the album/session.
 * @returns A promise resolving on success or rejecting after a permanent/final failure.
 */
export const deletePhotoWithRetry = async (
  url: string,
  signal: AbortSignal,
): Promise<void> => {
  for (let attempt = 0; attempt < MAX_DELETE_ATTEMPTS; attempt += 1) {
    signal.throwIfAborted();
    try {
      await deleteFromApi<void>(url, { signal });
      return;
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      const transient =
        axios.isAxiosError(error) &&
        !axios.isCancel(error) &&
        (status === undefined ||
          status === 408 ||
          status === 429 ||
          status >= 500);
      if (signal.aborted || !transient || attempt === MAX_DELETE_ATTEMPTS - 1)
        throw error;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, INITIAL_RETRY_DELAY_MS * 2 ** attempt);
      });
    }
  }
};
