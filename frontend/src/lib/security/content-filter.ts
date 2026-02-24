/**
 * Content filtering for chat messages
 * Prevents jailbreak attempts, off-topic requests, and inappropriate content
 */

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  sanitizedContent?: string;
}

// Patterns that indicate jailbreak attempts
const JAILBREAK_PATTERNS = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/i,
  /forget\s+(everything|all|your)\s+(you\s+)?(were|know|learned)/i,
  /disregard\s+(your|the)\s+(system|initial|original)/i,
  /override\s+(your|the)\s+(programming|instructions?|rules?)/i,
  /bypass\s+(your|the)\s+(restrictions?|limitations?|filters?)/i,

  // Role-playing exploits
  /pretend\s+(you\s+)?(are|to\s+be)\s+(a|an)\s+(?!user)/i,
  /act\s+as\s+(if\s+)?(you\s+)?(are|were)\s+(?!helping)/i,
  /roleplay\s+as/i,
  /you\s+are\s+now\s+(a|an)\s+(?!assistant|helper)/i,

  // DAN and similar exploits
  /\bdan\b.*\bmode\b/i,
  /\bjailbreak\b/i,
  /\bdeveloper\s+mode\b/i,
  /\bunlocked\s+mode\b/i,

  // Prompt injection markers
  /\[system\]/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /###\s*(system|instruction)/i,

  // Base64 encoded instructions
  /execute\s+(this\s+)?base64/i,
  /decode\s+and\s+(run|execute|follow)/i,
];

// Topics that are off-scope for ZKCred
const OFF_TOPIC_PATTERNS = [
  // Code generation for unrelated purposes
  /write\s+(me\s+)?(a\s+)?(python|javascript|code|script)\s+(for|to|that)/i,
  /generate\s+(a\s+)?(program|code|script)/i,

  // Unrelated crypto topics
  /how\s+to\s+(hack|exploit|attack)/i,
  /steal\s+(bitcoin|crypto|wallet|funds)/i,
  /wash\s+(trading|money)/i,

  // General assistant tasks
  /write\s+(me\s+)?(an?\s+)?(essay|article|story|poem)/i,
  /translate\s+(this|the\s+following)/i,
  /summarize\s+(this|the\s+following)\s+(?!credential)/i,

  // Harmful content
  /how\s+to\s+(make|create|build)\s+(a\s+)?(bomb|weapon|drug)/i,
  /illegal\s+(activity|activities)/i,
];

// Allowed topics related to ZKCred
const ALLOWED_TOPIC_KEYWORDS = [
  "credential",
  "wallet",
  "bitcoin",
  "btc",
  "tier",
  "shrimp",
  "crab",
  "fish",
  "whale",
  "verify",
  "verification",
  "proof",
  "zk",
  "zero knowledge",
  "privacy",
  "starknet",
  "sign",
  "signature",
  "connect",
  "holdings",
  "balance",
  "address",
  "pubkey",
  "public key",
];

/**
 * Check if content contains jailbreak attempts
 */
export function containsJailbreakAttempt(content: string): boolean {
  return JAILBREAK_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Check if content is off-topic
 */
export function isOffTopic(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Check if it matches any off-topic pattern
  const matchesOffTopic = OFF_TOPIC_PATTERNS.some((pattern) =>
    pattern.test(content)
  );

  if (!matchesOffTopic) {
    return false;
  }

  // Allow if it contains relevant keywords (might be a legitimate question)
  const hasAllowedKeyword = ALLOWED_TOPIC_KEYWORDS.some((keyword) =>
    lowerContent.includes(keyword)
  );

  return !hasAllowedKeyword;
}

/**
 * Check message length limits
 */
export function isWithinLimits(content: string): boolean {
  // Max 5000 characters per message
  return content.length <= 5000;
}

/**
 * Filter and validate user input
 */
export function filterUserInput(content: string): FilterResult {
  // Check length
  if (!isWithinLimits(content)) {
    return {
      allowed: false,
      reason: "Message is too long. Please keep messages under 5000 characters.",
    };
  }

  // Check for jailbreak attempts
  if (containsJailbreakAttempt(content)) {
    return {
      allowed: false,
      reason:
        "I can only help with ZKCred-related questions about Bitcoin credentials and privacy proofs.",
    };
  }

  // Check for off-topic content
  if (isOffTopic(content)) {
    return {
      allowed: false,
      reason:
        "I'm specialized in helping with ZKCred - creating and verifying Bitcoin holding credentials. How can I help you with that?",
    };
  }

  return {
    allowed: true,
    sanitizedContent: content.trim(),
  };
}

/**
 * Filter AI output to prevent leaking sensitive information
 */
export function filterAIOutput(content: string): string {
  // Remove any accidentally leaked environment variables or secrets
  let filtered = content;

  // Remove patterns that look like API keys or secrets
  filtered = filtered.replace(
    /([A-Za-z0-9_]+_KEY|SECRET|PASSWORD|TOKEN)\s*[=:]\s*['"]?[A-Za-z0-9+/=_-]{20,}['"]?/gi,
    "[REDACTED]"
  );

  // Remove potential private keys (hex strings of specific lengths)
  filtered = filtered.replace(/0x[a-fA-F0-9]{64}/g, "[REDACTED_KEY]");

  return filtered;
}
