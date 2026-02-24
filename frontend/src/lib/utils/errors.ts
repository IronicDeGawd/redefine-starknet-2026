/**
 * Error handling utilities for ZKCred
 */

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
    };
  }
}

/**
 * Common API errors
 */
export const Errors = {
  BadRequest: (message: string) => new ApiError(message, 400, "BAD_REQUEST"),
  Unauthorized: (message = "Unauthorized") =>
    new ApiError(message, 401, "UNAUTHORIZED"),
  NotFound: (message = "Not found") => new ApiError(message, 404, "NOT_FOUND"),
  Conflict: (message: string) => new ApiError(message, 409, "CONFLICT"),
  InternalError: (message = "Internal server error") =>
    new ApiError(message, 500, "INTERNAL_ERROR"),
  ServiceUnavailable: (message = "Service unavailable") =>
    new ApiError(message, 503, "SERVICE_UNAVAILABLE"),
} as const;

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Unknown error occurred";
}

/**
 * Check if an error is a specific Starknet error
 */
export function isStarknetError(
  error: unknown,
  errorMessage: string
): boolean {
  const message = getErrorMessage(error);
  return message.toLowerCase().includes(errorMessage.toLowerCase());
}

/**
 * Parse Starknet error for user-friendly message
 */
export function parseStarknetError(error: unknown): string {
  const message = getErrorMessage(error);

  // Map common Starknet errors to user-friendly messages
  if (isStarknetError(error, "already issued")) {
    return "A credential has already been issued for this wallet";
  }
  if (isStarknetError(error, "not found")) {
    return "Credential not found";
  }
  if (isStarknetError(error, "already revoked")) {
    return "This credential has already been revoked";
  }
  if (isStarknetError(error, "invalid tier")) {
    return "Invalid tier level specified";
  }
  if (isStarknetError(error, "paused")) {
    return "The credential system is temporarily paused";
  }
  if (isStarknetError(error, "insufficient")) {
    return "Insufficient funds for transaction";
  }

  // Generic fallback
  return `Transaction failed: ${message}`;
}
