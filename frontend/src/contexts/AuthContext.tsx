/* eslint-disable react-refresh/only-export-components -- The provider and hook intentionally share this context module. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { displayAlert } from '../components/common';
import {
  getFromApi,
  isUnauthorizedApiError,
  postToApi,
  patchToApi,
  setApiAccessToken,
  setUnauthorizedHandler,
} from '../utils/api';
import {
  AuthStatus,
  type AuthContextValue,
  type AuthResponse,
  type AuthSession,
  type CurrentUserResponse,
  type JwtPayload,
  type StoredSessionResult,
} from '../types/auth';
import { useLoading } from './LoadingContext';

// Increment the version suffix whenever the authentication API contract changes.
const SESSION_STORAGE_KEY = 'tripfolio.auth.v1';
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Decodes the expiry claim from a JWT without treating the client as a token
 * authority. The result only enables an early cleanup before backend validation.
 *
 * @param token - Encoded access token returned by the backend.
 * @returns Whether the token is malformed, lacks an expiry, or has expired.
 */
const isJwtExpired = (token: string): boolean => {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return true;

    const normalizedPayload = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '=',
    );
    const payload = JSON.parse(atob(paddedPayload)) as JwtPayload;

    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

/**
 * Reads a structurally valid session from local storage. It rejects incomplete
 * or expired values so corrupted browser state cannot enter the auth context.
 *
 * @returns The restorable session and whether an unusable JWT caused rejection.
 */
export const readStoredSession = (): StoredSessionResult => {
  try {
    const serializedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!serializedSession) return { session: null, hasStaleToken: false };

    const session = JSON.parse(serializedSession) as Partial<AuthSession>;
    const user = session.user;
    if (
      typeof session.token !== 'string' ||
      !user ||
      typeof user.id !== 'string' ||
      typeof user.username !== 'string' ||
      typeof user.email !== 'string' ||
      !Array.isArray(user.friends)
    ) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return { session: null, hasStaleToken: false };
    }

    if (isJwtExpired(session.token)) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return { session: null, hasStaleToken: true };
    }

    return { session: session as AuthSession, hasStaleToken: false };
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return { session: null, hasStaleToken: false };
  }
};

/**
 * Provides authenticated user state and account actions to the application.
 * It restores saved credentials, validates them with the backend, and clears
 * the session whenever an authenticated API call reports a stale token.
 *
 * @param props - Application tree that consumes authentication state.
 * @returns The authentication context boundary.
 */
export const AuthProvider = ({ children }: PropsWithChildren) => {
  const { setLoading } = useLoading();
  const [storedSessionResult] = useState(readStoredSession);
  const { session: storedSession, hasStaleToken } = storedSessionResult;
  const [session, setSession] = useState<AuthSession | null>(storedSession);
  const [status, setStatus] = useState<AuthStatus>(
    storedSession ? AuthStatus.Checking : AuthStatus.Anonymous,
  );
  const staleSessionHandled = useRef(false);

  /** Saves a newly authenticated session and configures future API requests. */
  const saveSession = useCallback((nextSession: AuthSession) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setApiAccessToken(nextSession.token);
    setSession(nextSession);
    setStatus(AuthStatus.Authenticated);
    staleSessionHandled.current = false;
  }, []);

  /** Removes all client-side credentials and returns auth state to anonymous. */
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setApiAccessToken(null);
    setSession(null);
    setStatus(AuthStatus.Anonymous);
  }, []);

  // Explains a redirect caused by a token rejected during local restoration.
  useEffect(() => {
    if (!hasStaleToken || staleSessionHandled.current) return;

    staleSessionHandled.current = true;
    displayAlert({
      title: 'Session expired',
      message: 'Log in again to continue.',
      tone: 'error',
    });
  }, [hasStaleToken]);

  // Refreshes cached account data without discarding it during transient outages.
  useEffect(() => {
    let cancelled = false;

    if (!storedSession) return;

    setApiAccessToken(storedSession.token);
    setLoading(true);

    /** Validates stored credentials, falling back to cached data during outages. */
    const restoreSession = async () => {
      try {
        const response = await getFromApi<CurrentUserResponse>('/users/me');
        if (!cancelled) {
          saveSession({ token: storedSession.token, user: response.user });
        }
      } catch (error) {
        if (!cancelled) {
          if (isUnauthorizedApiError(error)) {
            clearSession();
          } else {
            setStatus(AuthStatus.Authenticated);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession, saveSession, setLoading, storedSession]);

  // Converts authenticated 401 responses into one global session-expiry event.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (staleSessionHandled.current) return;

      staleSessionHandled.current = true;
      clearSession();
      displayAlert({
        title: 'Session expired',
        message: 'Log in again to continue.',
        tone: 'error',
      });
    });

    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  /** Authenticates an existing account and persists its returned session. */
  const login = useCallback(
    async (email: string, password: string) => {
      const response = await postToApi<
        AuthResponse,
        { email: string; password: string }
      >('/users/login', { email, password });
      saveSession(response);
      return response.user;
    },
    [saveSession],
  );

  /** Creates an account and persists the session returned by registration. */
  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const response = await postToApi<
        AuthResponse,
        { username: string; email: string; password: string }
      >('/users/register', { username, email, password });
      saveSession(response);
      return response.user;
    },
    [saveSession],
  );

  /**
   * Saves an image through the account API and persists the returned identity.
   * @param picture - Compressed image data URL to store for this account.
   * @returns A promise resolving when the account and browser session are updated.
   */
  const updateProfilePicture = async (picture: string): Promise<void> => {
    if (!session) throw new Error('Log in to set a profile picture.');
    const response = await patchToApi<CurrentUserResponse>(
      '/users/profile_picture',
      {
        profile_picture: picture,
      },
    );
    if (readStoredSession().session?.token === session.token) {
      saveSession({ ...session, user: response.user });
    }
  };

  return (
    <AuthContext
      value={{
        user: session?.user ?? null,
        status,
        login,
        register,
        logout: clearSession,
        updateProfilePicture,
      }}
    >
      {children}
    </AuthContext>
  );
};

/**
 * Reads the active user and auth actions from the nearest provider.
 *
 * @returns Current authentication state and account actions.
 * @throws When called outside `AuthProvider`.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
