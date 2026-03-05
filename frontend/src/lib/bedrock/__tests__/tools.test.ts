import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT, agentTools, buildToolConfig } from "../tools";

describe("SYSTEM_PROMPT", () => {
  it("mentions all 7 credential types", () => {
    const types = [
      "btc_tier", "wallet_age", "eth_holder", "github_dev",
      "codeforces_coder", "steam_gamer", "strava_athlete",
    ];
    for (const type of types) {
      expect(SYSTEM_PROMPT).toContain(type);
    }
  });

  it("includes tier tables for each credential", () => {
    const labels = [
      "BTC Holdings", "Wallet Age", "ETH Holdings",
      "GitHub Developer", "Codeforces Coder", "Steam Gamer", "Strava Athlete",
    ];
    for (const label of labels) {
      expect(SYSTEM_PROMPT).toContain(label);
    }
  });

  it("includes security constraints", () => {
    expect(SYSTEM_PROMPT).toContain("JAILBREAK PREVENTION");
    expect(SYSTEM_PROMPT).toContain("SCOPE LIMITATION");
  });

  it("includes privacy principles", () => {
    expect(SYSTEM_PROMPT).toContain("zero-knowledge");
    expect(SYSTEM_PROMPT).toContain("Poseidon");
  });
});

describe("agentTools", () => {
  it("defines exactly 8 tools", () => {
    expect(agentTools).toHaveLength(8);
  });

  it("has all expected tool names", () => {
    const names = agentTools.map((t) => t.name);
    expect(names).toContain("connect_btc_wallet");
    expect(names).toContain("connect_eth_wallet");
    expect(names).toContain("start_oauth");
    expect(names).toContain("request_signature");
    expect(names).toContain("issue_credential");
    expect(names).toContain("verify_credential");
    expect(names).toContain("connect_starknet_wallet");
    expect(names).toContain("mint_badge_nft");
  });

  it("each tool has valid schema structure", () => {
    for (const tool of agentTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema).toHaveProperty("properties");
      expect(tool.inputSchema).toHaveProperty("required");
      expect(Array.isArray(tool.inputSchema.required)).toBe(true);
    }
  });

  it("issue_credential accepts all 7 credential types", () => {
    const issueTool = agentTools.find((t) => t.name === "issue_credential");
    const credTypeEnum = (issueTool?.inputSchema.properties.credentialType as { enum?: string[] })?.enum;
    expect(credTypeEnum).toContain("btc_tier");
    expect(credTypeEnum).toContain("eth_holder");
    expect(credTypeEnum).toContain("github_dev");
    expect(credTypeEnum).toContain("codeforces_coder");
    expect(credTypeEnum).toContain("steam_gamer");
    expect(credTypeEnum).toContain("strava_athlete");
  });

  it("start_oauth supports all 4 OAuth platforms", () => {
    const oauthTool = agentTools.find((t) => t.name === "start_oauth");
    const platformEnum = (oauthTool?.inputSchema.properties.platform as { enum?: string[] })?.enum;
    expect(platformEnum).toContain("github");
    expect(platformEnum).toContain("codeforces");
    expect(platformEnum).toContain("steam");
    expect(platformEnum).toContain("strava");
  });
});

describe("buildToolConfig", () => {
  it("returns Bedrock-compatible tool config", () => {
    const config = buildToolConfig();
    expect(config).toHaveProperty("tools");
    expect(Array.isArray(config.tools)).toBe(true);
    expect(config.tools).toHaveLength(8);
  });

  it("wraps each tool in toolSpec format", () => {
    const config = buildToolConfig();
    for (const tool of config.tools) {
      expect(tool).toHaveProperty("toolSpec");
      expect(tool.toolSpec).toHaveProperty("name");
      expect(tool.toolSpec).toHaveProperty("description");
      expect(tool.toolSpec).toHaveProperty("inputSchema");
      expect(tool.toolSpec.inputSchema).toHaveProperty("json");
    }
  });
});
