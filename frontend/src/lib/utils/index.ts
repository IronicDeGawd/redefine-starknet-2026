export {
  hashPubkey,
  generateRandomSalt,
  generateCredentialId,
  stringToFelt,
  feltToString,
  formatCredentialId,
  isValidHex,
  normalizeHex,
  verifyBitcoinSignature,
} from "./crypto";

export {
  validateChatRequest,
  validateIssueRequest,
  validateCredentialId,
  isValidCredentialType,
  isValidTier,
  sanitizeString,
  type ValidationResult,
} from "./validation";

export {
  ApiError,
  Errors,
  getErrorMessage,
  isStarknetError,
  parseStarknetError,
} from "./errors";
