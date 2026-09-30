import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/**
 * Identifies an API rejection that definitively invalidates authentication.
 * Axios errors are inspected for an HTTP 401 response; network and server
 * failures return false because they do not prove the token is stale.
 *
 * @param error - Unknown rejection received from an API request.
 * @returns Whether the backend responded with HTTP 401 Unauthorized.
 */
export const isUnauthorizedApiError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 401;

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isUnauthorizedApiError(error) && accessToken) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  },
);

/**
 * Updates the bearer token attached to subsequent API requests. Keeping the
 * mutable token beside the Axios instance avoids coupling transport code to React.
 *
 * @param token - Active access token, or null when the user is signed out.
 * @returns Nothing.
 */
export const setApiAccessToken = (token: string | null): void => {
  accessToken = token;
};

/**
 * Registers the callback invoked when an authenticated request receives a 401.
 * The auth provider uses it to clear stale sessions without routing from Axios.
 *
 * @param handler - Session-expiry callback, or null to unregister it.
 * @returns Nothing.
 */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

/**
 * Builds an absolute backend URL for resources rendered outside Axios.
 *
 * @param url - The API path to resolve against the configured backend URL.
 * @returns The absolute URL used by native browser resource requests.
 */
export const getApiUrl = (url: string): string => {
  const baseUrl = api.defaults.baseURL ?? '';
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

/**
 * Fetches a typed resource from the backend API. The shared Axios instance
 * applies the configured backend base URL, and only the response body is returned.
 *
 * @param url - The API path to request, relative to the backend base URL.
 * @param config - Optional Axios request configuration such as query parameters.
 * @returns The typed response body returned by the backend.
 */
export const getFromApi = async <TResponse>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<TResponse> => {
  const response = await api.get<TResponse>(url, config);

  return response.data;
};

/**
 * Creates a resource through the backend API. The shared Axios instance sends
 * the supplied body to the configured backend and returns only the response body.
 *
 * @param url - The API path to request, relative to the backend base URL.
 * @param data - The typed request body to send.
 * @param config - Optional Axios request configuration such as headers.
 * @returns The typed response body returned by the backend.
 */
export const postToApi = async <TResponse, TRequest = unknown>(
  url: string,
  data?: TRequest,
  config?: AxiosRequestConfig<TRequest>,
): Promise<TResponse> => {
  const response = await api.post<TResponse>(url, data, config);

  return response.data;
};

/**
 * Partially updates a resource through the backend API. The shared Axios
 * instance sends the supplied patch body and returns only the response body.
 *
 * @param url - The API path to request, relative to the backend base URL.
 * @param data - The typed patch body to send.
 * @param config - Optional Axios request configuration such as headers.
 * @returns The typed response body returned by the backend.
 */
export const patchToApi = async <TResponse, TRequest = unknown>(
  url: string,
  data: TRequest,
  config?: AxiosRequestConfig<TRequest>,
): Promise<TResponse> => {
  const response = await api.patch<TResponse>(url, data, config);

  return response.data;
};

/**
 * Deletes a resource through the backend API. The shared Axios instance sends
 * the request to the configured backend and returns only the response body.
 *
 * @param url - The API path to request, relative to the backend base URL.
 * @param config - Optional Axios request configuration such as headers.
 * @returns The typed response body returned by the backend.
 */
export const deleteFromApi = async <TResponse>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<TResponse> => {
  const response = await api.delete<TResponse>(url, config);

  return response.data;
};

/**
 * Fetches protected binary content through the authenticated Axios client.
 * This supports resources such as images that cannot attach bearer headers
 * when loaded directly through a native element URL.
 *
 * @param url - The API path containing the binary resource.
 * @returns The response body as a browser Blob.
 */
export const getBlobFromApi = async (url: string): Promise<Blob> => {
  const response = await api.get<Blob>(url, { responseType: 'blob' });

  return response.data;
};

/**
 * Extracts a backend error message while preserving a caller-supplied fallback.
 * Axios response bodies are inspected defensively because network errors may
 * not include a JSON response.
 *
 * @param error - Unknown value caught from an API request.
 * @param fallback - Message used when the backend did not return one.
 * @returns A user-facing error message.
 */
export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!axios.isAxiosError<{ message?: unknown }>(error)) return fallback;

  const message = error.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};
