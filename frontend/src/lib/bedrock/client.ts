/**
 * AWS Bedrock client setup
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
  type ConverseCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";

let clientInstance: BedrockRuntimeClient | null = null;

/**
 * Get the Bedrock client (singleton)
 */
export function getBedrockClient(): BedrockRuntimeClient {
  if (!clientInstance) {
    const region = process.env.AWS_REGION || "ap-south-1";

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set"
      );
    }

    clientInstance = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return clientInstance;
}

/**
 * Model ID — configurable via env, defaults to Claude Haiku 4.5 (global inference)
 */
export const MODEL_ID =
  process.env.LLM_BEDROCK_MODEL_ID ||
  "global.anthropic.claude-haiku-4-5-20251001-v1:0";

/**
 * Invoke the Bedrock model with the Converse API
 */
export async function invokeModel(
  input: ConverseCommandInput
): Promise<ConverseCommandOutput> {
  const client = getBedrockClient();
  const command = new ConverseCommand(input);
  return client.send(command);
}

/**
 * Check if Bedrock credentials are configured
 */
export function isBedrockConfigured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );
}
