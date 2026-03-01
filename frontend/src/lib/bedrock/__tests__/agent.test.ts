import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the bedrock client before importing agent
vi.mock("../client", () => ({
  invokeModel: vi.fn(),
  MODEL_ID: "test-model",
}));

import { invokeAgent } from "../agent";
import { invokeModel } from "../client";

const mockInvokeModel = vi.mocked(invokeModel);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invokeAgent", () => {
  it("returns text response for regular messages", async () => {
    mockInvokeModel.mockResolvedValue({
      output: {
        message: {
          content: [{ text: "Hello! I can help you create a credential." }],
        },
      },
      stopReason: "end_turn",
      $metadata: {},
    });

    const result = await invokeAgent([{ role: "user", content: "Hello" }]);

    expect(result.type).toBe("text");
    expect(result.content).toBe("Hello! I can help you create a credential.");
  });

  it("returns tool_use response when agent calls a tool", async () => {
    mockInvokeModel.mockResolvedValue({
      output: {
        message: {
          content: [
            { text: "Let me connect your wallet." },
            {
              toolUse: {
                toolUseId: "tool-123",
                name: "connect_btc_wallet",
                input: {},
              },
            },
          ],
        },
      },
      stopReason: "tool_use",
      $metadata: {},
    });

    const result = await invokeAgent([
      { role: "user", content: "Connect my Bitcoin wallet" },
    ]);

    expect(result.type).toBe("tool_use");
    expect(result.toolUse?.name).toBe("connect_btc_wallet");
    expect(result.toolUse?.id).toBe("tool-123");
    expect(result.content).toBe("Let me connect your wallet.");
  });

  it("handles empty response content", async () => {
    mockInvokeModel.mockResolvedValue({
      output: { message: { content: [] } },
      stopReason: "end_turn",
      $metadata: {},
    });

    const result = await invokeAgent([{ role: "user", content: "Test" }]);

    expect(result.type).toBe("text");
    expect(result.content).toContain("couldn't generate a response");
  });

  it("handles missing output", async () => {
    mockInvokeModel.mockResolvedValue({
      output: undefined,
      stopReason: "end_turn",
      $metadata: {},
    });

    const result = await invokeAgent([{ role: "user", content: "Test" }]);

    expect(result.type).toBe("text");
    expect(result.content).toContain("couldn't generate a response");
  });

  it("passes tool results to the model", async () => {
    mockInvokeModel.mockResolvedValue({
      output: {
        message: {
          content: [{ text: "Great, your wallet is connected!" }],
        },
      },
      stopReason: "end_turn",
      $metadata: {},
    });

    const result = await invokeAgent(
      [{ role: "user", content: "Connect wallet" }],
      [{ toolUseId: "tool-123", result: { address: "bc1qtest" } }]
    );

    expect(result.type).toBe("text");
    // Verify invokeModel was called with tool results
    const callArgs = mockInvokeModel.mock.calls[0][0];
    const lastMessage = callArgs.messages?.[callArgs.messages.length - 1];
    expect(lastMessage?.role).toBe("user");
    expect(lastMessage?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolResult: expect.objectContaining({ toolUseId: "tool-123" }),
        }),
      ])
    );
  });

  it("concatenates multiple text blocks", async () => {
    mockInvokeModel.mockResolvedValue({
      output: {
        message: {
          content: [
            { text: "First part." },
            { text: "Second part." },
          ],
        },
      },
      stopReason: "end_turn",
      $metadata: {},
    });

    const result = await invokeAgent([{ role: "user", content: "Test" }]);

    expect(result.type).toBe("text");
    expect(result.content).toBe("First part.\nSecond part.");
  });

  it("sends system prompt and tool config", async () => {
    mockInvokeModel.mockResolvedValue({
      output: { message: { content: [{ text: "Ok" }] } },
      stopReason: "end_turn",
      $metadata: {},
    });

    await invokeAgent([{ role: "user", content: "Hello" }]);

    const callArgs = mockInvokeModel.mock.calls[0][0];
    expect(callArgs.system).toBeDefined();
    expect(callArgs.system?.[0]).toHaveProperty("text");
    expect(callArgs.toolConfig).toBeDefined();
    expect(callArgs.inferenceConfig?.maxTokens).toBe(1024);
    expect(callArgs.inferenceConfig?.temperature).toBe(0.7);
  });
});
