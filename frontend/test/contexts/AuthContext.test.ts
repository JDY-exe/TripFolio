import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStoredSession } from '../../src/contexts/AuthContext';

const storageKey = 'tripfolio.auth.v1';

/**
 * Builds a structurally valid stored session with the requested JWT expiry.
 * Encoding only the payload is sufficient because the client does not verify signatures.
 *
 * @param expiresAt - Expiry time expressed in Unix seconds.
 * @returns A serialized session suitable for the local-storage reader.
 */
const createSerializedSession = (expiresAt: number) => {
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString(
    'base64url',
  );

  return JSON.stringify({
    token: `header.${payload}.signature`,
    user: {
      id: 'user-1',
      username: 'traveler',
      email: 'traveler@example.com',
      friends: [],
    },
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readStoredSession', () => {
  it('restores a complete unexpired session', () => {
    const serialized = createSerializedSession(
      Math.floor(Date.now() / 1000) + 60,
    );
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => serialized),
      removeItem: vi.fn(),
    });

    expect(readStoredSession()).toEqual({
      session: JSON.parse(serialized),
      hasStaleToken: false,
    });
  });

  it('removes a malformed stored session without calling it expired', () => {
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => '{not-json'),
      removeItem,
    });

    expect(readStoredSession()).toEqual({
      session: null,
      hasStaleToken: false,
    });
    expect(removeItem).toHaveBeenCalledWith(storageKey);
  });

  it('reports an expired token so the redirect can explain the stale session', () => {
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) =>
        key === storageKey
          ? createSerializedSession(Math.floor(Date.now() / 1000) - 60)
          : null,
      ),
      removeItem,
    });

    expect(readStoredSession()).toEqual({
      session: null,
      hasStaleToken: true,
    });
    expect(removeItem).toHaveBeenCalledWith(storageKey);
  });

  it('does not label missing browser state as a stale token', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
    });

    expect(readStoredSession()).toEqual({
      session: null,
      hasStaleToken: false,
    });
  });
});
