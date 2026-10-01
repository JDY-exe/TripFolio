/** User identity returned by authentication and account APIs. */
export interface AuthUser {
  /** MongoDB identifier returned by the backend. */
  id: string;
  /** Public account name. */
  username: string;
  /** Email used to authenticate the account. */
  email: string;
  /** Optional profile-picture reference. */
  profile_picture?: string;
  /** User identifiers connected to this account. */
  friends: string[];
}

/** Named authentication lifecycle values used by route guards and account pages. */
export const AuthStatus = {
  Checking: 'checking',
  Authenticated: 'authenticated',
  Anonymous: 'anonymous',
} as const;

/** Authentication lifecycle state derived from the runtime status values. */
export type AuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus];

/** Persisted credentials used to restore an authenticated browser session. */
export interface AuthSession {
  token: string;
  user: AuthUser;
}

/** Result of reading browser storage before the auth provider initializes. */
export interface StoredSessionResult {
  session: AuthSession | null;
  hasStaleToken: boolean;
}

/** Login and registration payload returned after successful authentication. */
export interface AuthResponse extends AuthSession {
  message: string;
}

/** Response returned when refreshing the authenticated user's profile. */
export interface CurrentUserResponse {
  user: AuthUser;
}

/** Public state and account actions exposed to authenticated application UI. */
export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<AuthUser>;
  logout: () => void;
  /** Saves a profile image and refreshes the persisted account data. */
  updateProfilePicture: (picture: string) => Promise<void>;
}

/** Minimal JWT payload decoded locally to detect expired persisted sessions. */
export interface JwtPayload {
  exp?: number;
}
