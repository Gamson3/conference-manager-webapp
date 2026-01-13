/**
 * API Client Configuration
 * Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosError, AxiosHeaders, AxiosInstance, AxiosResponse, type AxiosRequestConfig } from 'axios';
import {
  STATUS_MESSAGES,
  CODE_MESSAGES,
  CONTEXT_MESSAGES,
  DEFAULT_ERROR_MESSAGE,
} from '../errorMessages';

// Use the correct environment variable name; fall back to sensible default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Always attach latest Cognito access token
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window === 'undefined') {
      // Avoid importing client-only auth libraries during SSR/build.
      return config;
    }
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      if (token) {
        const headers = config.headers ?? new AxiosHeaders();
        if (headers instanceof AxiosHeaders) {
          headers.set('Authorization', `Bearer ${token}`);
        } else {
          (headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
        config.headers = headers;
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle responses and errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const cfg = (error.config ?? undefined) as (AxiosRequestConfig & { suppress401Redirect?: boolean }) | undefined;
      const suppressedByHeader =
        typeof (cfg?.headers as { get?: (name: string) => string | null } | undefined)?.get === 'function'
          ? Boolean((cfg?.headers as { get: (name: string) => string | null }).get('X-Suppress-401-Redirect'))
          : Boolean((cfg?.headers as Record<string, string> | undefined)?.['X-Suppress-401-Redirect']);
      const suppressed = Boolean(cfg?.suppress401Redirect) || suppressedByHeader;

      const isProtectedPath = (pathname: string): boolean =>
        pathname.startsWith('/account') ||
        pathname.startsWith('/organizer') ||
        pathname.startsWith('/attendee') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/conferences/new') ||
        pathname.startsWith('/onboarding');

      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;

        // Only force a login redirect when the user is on a protected page.
        // Public pages (e.g. /conferences/[id]) should remain viewable to guests.
        if (!suppressed && isProtectedPath(currentPath)) {
          try { await signOut(); } catch {}
          // Clear any local remnants
          localStorage.removeItem('accessToken');
          localStorage.removeItem('idToken');
          localStorage.removeItem('user');

          if (currentPath !== '/login') {
            const loginUrl = new URL('/login', window.location.origin);
            loginUrl.searchParams.set('redirect', currentPath);
            window.location.href = loginUrl.toString();
          }
        }
      }
    }
    if (error.response?.status === 403) {
      const cfg = (error.config ?? undefined) as (AxiosRequestConfig & { suppress403Redirect?: boolean }) | undefined;
      const suppressedByHeader =
        typeof (cfg?.headers as { get?: (name: string) => string | null } | undefined)?.get === 'function'
          ? Boolean((cfg?.headers as { get: (name: string) => string | null }).get('X-Suppress-403-Redirect'))
          : Boolean((cfg?.headers as Record<string, string> | undefined)?.['X-Suppress-403-Redirect']);
      const suppressed = Boolean(cfg?.suppress403Redirect) || suppressedByHeader;
      if (!suppressed) {
        // Forbidden: do not sign out, just route to a safe page
        if (typeof window !== 'undefined') {
          if (window.location.pathname !== '/not-authorized') window.location.href = '/not-authorized';
        }
      }
    }
    return Promise.reject(error);
  }
);

async function signOut(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { signOut: cognitoSignOut } = await import('../auth/cognito');
    await cognitoSignOut();
  } catch {}
}

/**
 * API error response shape from server.
 */
interface ApiErrorResponse {
  code?: string;
  message?: string;
  error?: string;
}

/**
 * Convert an API error to a user-friendly message.
 *
 * IMPORTANT: This function NEVER exposes raw server error messages.
 * It maps error codes and HTTP statuses to predefined friendly messages.
 */
export const handleApiError = (error: unknown): string => {
  // Network errors (no response received)
  if (error instanceof Error && error.message === 'Network Error') {
    return CONTEXT_MESSAGES.NETWORK_ERROR;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Server responded with error
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data;

      // Use server error code if available (maps to CODE_MESSAGES)
      if (data?.code && data.code in CODE_MESSAGES) {
        return CODE_MESSAGES[data.code];
      }

      // Fall back to HTTP status message
      if (status in STATUS_MESSAGES) {
        return STATUS_MESSAGES[status];
      }

      // Generic fallback - never expose raw message
      return DEFAULT_ERROR_MESSAGE;
    }

    // Request was made but no response (network issue)
    if (axiosError.request) {
      return CONTEXT_MESSAGES.NETWORK_ERROR;
    }

    // Request setup error (timeout, etc.)
    if (axiosError.code === 'ECONNABORTED') {
      return CONTEXT_MESSAGES.TIMEOUT;
    }

    // Generic axios error
    return DEFAULT_ERROR_MESSAGE;
  }

  // Non-axios error
  return CONTEXT_MESSAGES.UNKNOWN;
};

/**
 * Check if an error is a 404 Not Found error.
 */
export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

/**
 * Check if an error is a 403 Forbidden error.
 */
export function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

/**
 * Check if an error is a 401 Unauthorized error.
 */
export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

/**
 * Check if an error is a 409 Conflict error.
 */
export function isConflictError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}

/**
 * Check if an error is a network/connection error.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'Network Error') {
    return true;
  }
  return axios.isAxiosError(error) && !error.response;
}

export default apiClient;
