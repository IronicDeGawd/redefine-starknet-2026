/**
 * ZKCred Discord Bot — Slash Command Registration
 *
 * Run this once to register the /verify command with Discord's API.
 * Usage: DISCORD_TOKEN=xxx DISCORD_CLIENT_ID=xxx node register-commands.js
 */

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error(
    "Missing required environment variables: DISCORD_TOKEN, DISCORD_CLIENT_ID"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Command Definitions
// ---------------------------------------------------------------------------

const commands = [
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify a ZKCred credential and receive your tier role")
    .addStringOption((option) =>
      option
        .setName("credential_id")
        .setDescription("Your ZKCred credential ID")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

// ---------------------------------------------------------------------------
// Register Commands
// ---------------------------------------------------------------------------

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering slash commands with Discord...");

    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log("Successfully registered the /verify command.");
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
})();
