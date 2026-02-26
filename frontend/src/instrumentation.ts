/**
 * Next.js Instrumentation — runs once on server startup.
 * Used to start the Discord bot alongside the Next.js server.
 */

export async function register() {
  // Only run on the Node.js server runtime (not edge, not client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDiscordBot } = await import("@/lib/discord/bot");
    await startDiscordBot();
  }
}
