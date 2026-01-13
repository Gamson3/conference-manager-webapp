/**
 * User-friendly error messages for API errors.
 *
 * NEVER expose raw server error messages to users. Use these constants
 * to ensure consistent, actionable error messaging throughout the app.
 */

/**
 * Error messages by HTTP status code.
 */
export const STATUS_MESSAGES: Record<number, string> = {
  400: "The request could not be processed. Please check your input and try again.",
  401: "Please sign in to continue.",
  403: "You don't have permission to access this resource.",
  404: "The requested resource was not found.",
  409: "This action conflicts with existing data. Please refresh and try again.",
  422: "The provided data is invalid. Please check your input.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again later.",
  502: "The server is temporarily unavailable. Please try again later.",
  503: "Service temporarily unavailable. Please try again later.",
  504: "The request timed out. Please try again.",
} as const;

/**
 * Error messages by server error code (from ApiErrorCode).
 */
export const CODE_MESSAGES: Record<string, string> = {
  INVALID_ARGUMENT: "Please check your input and try again.",
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested item was not found.",
  CONFLICT: "This action conflicts with existing data.",
  INTERNAL: "Something went wrong. Please try again.",
} as const;

/**
 * Context-specific error messages.
 */
export const CONTEXT_MESSAGES = {
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  TIMEOUT: "The request took too long. Please try again.",
  UNKNOWN: "An unexpected error occurred. Please try again.",

  // Auth-specific
  LOGIN_FAILED: "Login failed. Please check your credentials.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",

  // Form-specific
  VALIDATION_FAILED: "Please correct the errors in the form.",
  REQUIRED_FIELD: "This field is required.",

  // Conference-specific
  REGISTRATION_CLOSED: "Registration is not currently open for this conference.",
  ALREADY_REGISTERED: "You are already registered for this conference.",
  CAPACITY_FULL: "This event has reached capacity.",

  // Submission-specific
  SUBMISSION_CLOSED: "Abstract submissions are closed for this conference.",
  DEADLINE_PASSED: "The submission deadline has passed.",
} as const;

/**
 * Default fallback message when no specific message is available.
 */
export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * Get a user-friendly error message for an HTTP status code.
 */
export function getStatusMessage(status: number): string {
  return STATUS_MESSAGES[status] ?? DEFAULT_ERROR_MESSAGE;
}

/**
 * Get a user-friendly error message for an error code.
 */
export function getCodeMessage(code: string): string {
  return CODE_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
}
