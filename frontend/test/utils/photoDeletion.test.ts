import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFromApi } from '../../src/utils/api';
import { deletePhotoWithRetry } from '../../src/utils/photoDeletion';

vi.mock('../../src/utils/api', () => ({ deleteFromApi: vi.fn() }));

const remove = vi.mocked(deleteFromApi);
const url = '/trip/trip-1/photos/photo-1';

/** Creates an Axios-shaped failure for retry policy tests.
 * @param status - HTTP status, or undefined for a network failure.
 * @returns An error recognized by Axios with an optional HTTP response.
 */
const requestError = (status?: number) => ({
  isAxiosError: true,
  ...(status === undefined ? {} : { response: { status } }),
});

beforeEach(() => {
  vi.useFakeTimers();
  remove.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('deletePhotoWithRetry', () => {
  it('sends one request when deletion succeeds immediately', async () => {
    remove.mockResolvedValue(undefined);
    const { signal } = new AbortController();
    await deletePhotoWithRetry(url, signal);
    expect(remove).toHaveBeenCalledExactlyOnceWith(url, { signal });
  });

  it.each([undefined, 408, 429, 500, 503])(
    'retries a transient %s failure with exponential backoff',
    async (status) => {
      remove
        .mockRejectedValueOnce(requestError(status))
        .mockRejectedValueOnce(requestError(status))
        .mockResolvedValue(undefined);
      const operation = deletePhotoWithRetry(url, new AbortController().signal);
      await vi.advanceTimersByTimeAsync(499);
      expect(remove).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(remove).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(999);
      expect(remove).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      await operation;
      expect(remove).toHaveBeenCalledTimes(3);
    },
  );

  it('stops after three failed attempts and preserves the final error', async () => {
    const error = requestError(500);
    remove.mockRejectedValue(error);
    const result = expect(
      deletePhotoWithRetry(url, new AbortController().signal),
    ).rejects.toBe(error);
    await vi.runAllTimersAsync();
    await result;
    expect(remove).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 403, 404, 413])(
    'does not retry HTTP %s',
    async (status) => {
      const error = requestError(status);
      remove.mockRejectedValue(error);
      await expect(
        deletePhotoWithRetry(url, new AbortController().signal),
      ).rejects.toBe(error);
      expect(remove).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('does not retry an unexpected non-transport error', async () => {
    const error = new Error('Unexpected failure');
    remove.mockRejectedValue(error);
    await expect(
      deletePhotoWithRetry(url, new AbortController().signal),
    ).rejects.toBe(error);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('stops retrying when the album or session is left during backoff', async () => {
    const controller = new AbortController();
    remove.mockRejectedValue(requestError(500));
    const operation = deletePhotoWithRetry(url, controller.signal);
    const result = expect(operation).rejects.toHaveProperty(
      'name',
      'AbortError',
    );
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.runAllTimersAsync();
    await result;
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
