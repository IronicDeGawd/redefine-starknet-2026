/**
 * Chat session storage service
 * Stores chat history in Redis with TTL for automatic cleanup
 */

import { getRedisClient, isRedisAvailable } from "./client";
import type { ChatMessage } from "@/types/api";

const SESSION_PREFIX = "zkcred:session:";
const SESSION_TTL = 60 * 60 * 24; // 24 hours
const MAX_MESSAGES_PER_SESSION = 100;

export interface ChatSession {
  id: string;
  walletAddress: string | null;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Get or create a chat session
 */
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const available = await isRedisAvailable();
  if (!available) {
    console.warn("[Session] Redis not available, using in-memory fallback");
    return null;
  }

  try {
    const client = getRedisClient();
    const key = SESSION_PREFIX + sessionId;
    const data = await client.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as ChatSession;
  } catch (error) {
    console.error("[Session] Error getting session:", error);
    return null;
  }
}

/**
 * Create a new chat session
 */
export async function createSession(
  sessionId: string,
  walletAddress: string | null = null
): Promise<ChatSession> {
  const session: ChatSession = {
    id: sessionId,
    walletAddress,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveSession(session);
  return session;
}

/**
 * Save a chat session
 */
export async function saveSession(session: ChatSession): Promise<void> {
  const available = await isRedisAvailable();
  if (!available) {
    return;
  }

  try {
    const client = getRedisClient();
    const key = SESSION_PREFIX + session.id;

    // Trim messages if exceeds max
    if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
      session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
    }

    session.updatedAt = Date.now();
    await client.setex(key, SESSION_TTL, JSON.stringify(session));
  } catch (error) {
    console.error("[Session] Error saving session:", error);
  }
}

/**
 * Add a message to a session
 */
export async function addMessageToSession(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  let session = await getSession(sessionId);

  if (!session) {
    session = await createSession(sessionId);
  }

  session.messages.push(message);
  await saveSession(session);
}

/**
 * Get messages from a session
 */
export async function getSessionMessages(
  sessionId: string
): Promise<ChatMessage[]> {
  const session = await getSession(sessionId);
  return session?.messages || [];
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const available = await isRedisAvailable();
  if (!available) {
    return;
  }

  try {
    const client = getRedisClient();
    const key = SESSION_PREFIX + sessionId;
    await client.del(key);
  } catch (error) {
    console.error("[Session] Error deleting session:", error);
  }
}

/**
 * Update wallet address for a session
 */
export async function updateSessionWallet(
  sessionId: string,
  walletAddress: string
): Promise<void> {
  let session = await getSession(sessionId);

  if (!session) {
    session = await createSession(sessionId, walletAddress);
    return;
  }

  session.walletAddress = walletAddress;
  await saveSession(session);
}
