import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
})

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
  const response = await api.get<TResponse>(url, config)

  return response.data
}

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
  const response = await api.post<TResponse>(url, data, config)

  return response.data
}

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
  const response = await api.patch<TResponse>(url, data, config)

  return response.data
}

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
  const response = await api.delete<TResponse>(url, config)

  return response.data
}
