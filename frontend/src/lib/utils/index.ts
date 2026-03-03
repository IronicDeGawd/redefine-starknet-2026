export {
  hashPubkey,
  generateRandomSalt,
  generateCredentialId,
  extractCredentialIdFromReceipt,
  stringToFelt,
  feltToString,
  formatCredentialId,
  isValidHex,
  normalizeHex,
  verifyBitcoinSignature,
  hashToFelt,
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
  isDuplicateError,
  parseStarknetError,
} from "./errors";
