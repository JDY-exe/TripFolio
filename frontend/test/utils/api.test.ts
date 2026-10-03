import { describe, expect, it } from 'vitest';
import { isUnauthorizedApiError } from '../../src/utils/api';

/**
 * Creates the minimum Axios-shaped error needed for HTTP status classification.
 * Axios recognizes errors through its marker before the helper reads the response.
 *
 * @param status - Optional HTTP response status; omit it for a network failure.
 * @returns An Axios-compatible error-shaped object.
 */
const createAxiosError = (status?: number) => {
  return {
    isAxiosError: true,
    ...(status === undefined ? {} : { response: { status } }),
  };
};

describe('isUnauthorizedApiError', () => {
  it('recognizes a confirmed unauthorized response', () => {
    expect(isUnauthorizedApiError(createAxiosError(401))).toBe(true);
  });

  it.each([
    ['server failure', createAxiosError(500)],
    ['network failure', createAxiosError()],
    ['non-Axios rejection', new Error('Request failed')],
  ])('does not invalidate the session for a %s', (_label, error) => {
    expect(isUnauthorizedApiError(error)).toBe(false);
  });
});
