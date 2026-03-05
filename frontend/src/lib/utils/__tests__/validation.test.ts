import { describe, it, expect } from "vitest";
import {
  validateChatRequest,
  validateIssueRequest,
  isValidCredentialType,
  isValidTier,
  sanitizeString,
} from "../validation";

describe("validateChatRequest", () => {
  it("accepts a valid chat request", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts multiple messages", () => {
    const result = validateChatRequest({
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
        { role: "user", content: "Create credential" },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts requests with tool results", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "Done" }],
      toolResults: [{ toolUseId: "abc123", result: { success: true } }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects null body", () => {
    expect(validateChatRequest(null).valid).toBe(false);
  });

  it("rejects non-object body", () => {
    expect(validateChatRequest("string").valid).toBe(false);
  });

  it("rejects missing messages", () => {
    expect(validateChatRequest({}).valid).toBe(false);
    expect(validateChatRequest({}).error).toContain("messages");
  });

  it("rejects empty messages array", () => {
    const result = validateChatRequest({ messages: [] });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects invalid message role", () => {
    const result = validateChatRequest({
      messages: [{ role: "system", content: "hi" }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("role");
  });

  it("rejects non-string message content", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: 123 }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("content");
  });

  it("rejects invalid tool results", () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "hi" }],
      toolResults: [{ toolUseId: 123 }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("toolUseId");
  });
});

describe("validateIssueRequest", () => {
  const validRequest = {
    btcPubkey: "02abc123",
    btcAddress: "bc1qtest",
    signature: "H3sigtest==",
    message: "ZKCred test",
    credentialType: "btc_tier",
    tier: 0,
  };

  it("accepts a valid issue request", () => {
    expect(validateIssueRequest(validRequest).valid).toBe(true);
  });

  it("rejects missing btcPubkey", () => {
    const { btcPubkey: _, ...rest } = validRequest;
    expect(validateIssueRequest(rest).valid).toBe(false);
  });

  it("rejects missing signature", () => {
    const { signature: _, ...rest } = validRequest;
    expect(validateIssueRequest(rest).valid).toBe(false);
  });

  it("rejects null body", () => {
    expect(validateIssueRequest(null).valid).toBe(false);
  });
});

describe("isValidCredentialType", () => {
  it("accepts all 7 credential types", () => {
    const types = [
      "btc_tier", "wallet_age", "eth_holder", "github_dev",
      "codeforces_coder", "steam_gamer", "strava_athlete",
    ];
    for (const type of types) {
      expect(isValidCredentialType(type)).toBe(true);
    }
  });

  it("rejects invalid types", () => {
    expect(isValidCredentialType("invalid")).toBe(false);
    expect(isValidCredentialType("leetcode_coder")).toBe(false);
    expect(isValidCredentialType("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidCredentialType(null)).toBe(false);
    expect(isValidCredentialType(undefined)).toBe(false);
    expect(isValidCredentialType(42)).toBe(false);
    expect(isValidCredentialType(true)).toBe(false);
  });
});

describe("isValidTier", () => {
  it("accepts tiers 0-3", () => {
    expect(isValidTier(0)).toBe(true);
    expect(isValidTier(1)).toBe(true);
    expect(isValidTier(2)).toBe(true);
    expect(isValidTier(3)).toBe(true);
  });

  it("rejects invalid tiers", () => {
    expect(isValidTier(-1)).toBe(false);
    expect(isValidTier(4)).toBe(false);
    expect(isValidTier(1.5)).toBe(false);
    expect(isValidTier("0")).toBe(false);
    expect(isValidTier(null)).toBe(false);
  });
});

describe("sanitizeString", () => {
  it("removes null bytes", () => {
    expect(sanitizeString("hello\x00world")).toBe("helloworld");
  });

  it("removes control characters", () => {
    expect(sanitizeString("hello\x01\x02world")).toBe("helloworld");
  });

  it("preserves newlines and tabs", () => {
    expect(sanitizeString("hello\n\tworld")).toBe("hello\n\tworld");
  });

  it("truncates at maxLength", () => {
    expect(sanitizeString("abcdef", 3)).toBe("abc");
  });

  it("uses default maxLength of 1000", () => {
    const long = "a".repeat(1500);
    expect(sanitizeString(long).length).toBe(1000);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeString("")).toBe("");
  });
});
