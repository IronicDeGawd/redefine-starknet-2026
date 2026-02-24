/**
 * Standard API error responses
 */

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const ApiErrors = {
  // Authentication errors
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "Missing or invalid API key",
    status: 401,
  },
  FORBIDDEN: {
    code: "FORBIDDEN",
    message: "API key does not have permission for this action",
    status: 403,
  },

  // Rate limiting
  RATE_LIMITED: {
    code: "RATE_LIMITED",
    message: "Rate limit exceeded. Please try again later.",
    status: 429,
  },

  // Validation errors
  BAD_REQUEST: {
    code: "BAD_REQUEST",
    message: "Invalid request parameters",
    status: 400,
  },
  INVALID_CREDENTIAL_ID: {
    code: "INVALID_CREDENTIAL_ID",
    message: "Invalid credential ID format",
    status: 400,
  },

  // Resource errors
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "Credential not found",
    status: 404,
  },
  CREDENTIAL_REVOKED: {
    code: "CREDENTIAL_REVOKED",
    message: "Credential has been revoked",
    status: 410,
  },

  // Server errors
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    status: 500,
  },
  SERVICE_UNAVAILABLE: {
    code: "SERVICE_UNAVAILABLE",
    message: "Service temporarily unavailable",
    status: 503,
  },
  BLOCKCHAIN_ERROR: {
    code: "BLOCKCHAIN_ERROR",
    message: "Failed to query blockchain",
    status: 502,
  },
} as const;

export type ApiErrorCode = keyof typeof ApiErrors;

export function createErrorResponse(
  errorType: ApiErrorCode,
  details?: unknown
): { body: ApiErrorResponse; status: number } {
  const error = ApiErrors[errorType];
  const errorBody: ApiErrorResponse["error"] = {
    code: error.code,
    message: error.message,
  };

  if (details !== undefined) {
    errorBody.details = details;
  }

  return {
    body: { error: errorBody },
    status: error.status,
  };
}
