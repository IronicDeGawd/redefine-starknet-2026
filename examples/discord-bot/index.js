/**
 * ZKCred Discord Bot
 *
 * Verifies ZKCred credentials via the public API and assigns Discord roles
 * based on the holder's tier (Shrimp / Crab / Fish / Whale).
 *
 * Environment variables:
 *   DISCORD_TOKEN     — Discord bot token
 *   DISCORD_CLIENT_ID — Discord application client ID
 *   GUILD_ID          — Discord server (guild) ID for role management
 *   ZKCRED_API_URL    — ZKCred API base URL (default: http://localhost:3000)
 *   ZKCRED_API_KEY    — ZKCred API key for authentication
 */

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ZKCRED_API_URL = process.env.ZKCRED_API_URL || "http://localhost:3000";
const ZKCRED_API_KEY = process.env.ZKCRED_API_KEY;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !GUILD_ID || !ZKCRED_API_KEY) {
  console.error(
    "Missing required environment variables. Please set:\n" +
      "  DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID, ZKCRED_API_KEY"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tier Configuration
// ---------------------------------------------------------------------------

/**
 * Maps ZKCred tier numbers to Discord role names, colors, and emoji.
 * Tier values come from the ZKCred credential registry on Starknet.
 */
const TIERS = {
  0: { name: "Shrimp", color: 0x95a5a6, emoji: "\ud83e\udd90" }, // Grey
  1: { name: "Crab", color: 0xf39c12, emoji: "\ud83e\udd80" }, // Amber
  2: { name: "Fish", color: 0x3498db, emoji: "\ud83d\udc1f" }, // Blue
  3: { name: "Whale", color: 0x9b59b6, emoji: "\ud83d\udc0b" }, // Purple
};

/** All tier role names — used when removing stale roles */
const TIER_ROLE_NAMES = Object.values(TIERS).map((t) => t.name);

// ---------------------------------------------------------------------------
// Discord Client Setup
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ---------------------------------------------------------------------------
// Slash Command Registration (on bot ready)
// ---------------------------------------------------------------------------

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Register the /verify slash command globally
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
  ].map((cmd) => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
      body: commands,
    });
    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }

  console.log("ZKCred Discord Bot is ready!");
});

// ---------------------------------------------------------------------------
// Command Handler
// ---------------------------------------------------------------------------

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "verify") return;

  const credentialId = interaction.options.getString("credential_id", true);

  // Defer the reply since the API call may take a moment
  await interaction.deferReply({ ephemeral: true });

  try {
    // ------------------------------------------------------------------
    // 1. Call the ZKCred verify endpoint
    // ------------------------------------------------------------------
    const response = await fetch(
      `${ZKCRED_API_URL}/api/v1/credentials/${encodeURIComponent(credentialId)}/verify`,
      {
        method: "POST",
        headers: {
          "x-api-key": ZKCRED_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Verification Failed")
            .setDescription(
              errorBody.error?.message ||
                `API returned status ${response.status}`
            )
            .setColor(0xe74c3c),
        ],
      });
      return;
    }

    const data = await response.json();

    // ------------------------------------------------------------------
    // 2. Handle invalid credentials
    // ------------------------------------------------------------------
    if (!data.valid) {
      const reasonMessages = {
        not_found: "This credential was not found on-chain.",
        revoked: "This credential has been revoked.",
        below_tier: "This credential does not meet the minimum tier.",
      };

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Credential Invalid")
            .setDescription(
              reasonMessages[data.reason] || "Credential could not be verified."
            )
            .setColor(0xe74c3c),
        ],
      });
      return;
    }

    // ------------------------------------------------------------------
    // 3. Credential is valid — assign the tier role
    // ------------------------------------------------------------------
    const { credential } = data;
    const tierInfo = TIERS[credential.tier];

    if (!tierInfo) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Unknown Tier")
            .setDescription(`Credential has unrecognized tier: ${credential.tier}`)
            .setColor(0xe74c3c),
        ],
      });
      return;
    }

    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(interaction.user.id);

    // Find or create the tier role
    let tierRole = guild.roles.cache.find((r) => r.name === tierInfo.name);
    if (!tierRole) {
      tierRole = await guild.roles.create({
        name: tierInfo.name,
        color: tierInfo.color,
        reason: "ZKCred tier role (auto-created)",
      });
      console.log(`Created role: ${tierInfo.name}`);
    }

    // Remove any existing tier roles from the member
    const rolesToRemove = member.roles.cache.filter((r) =>
      TIER_ROLE_NAMES.includes(r.name)
    );
    if (rolesToRemove.size > 0) {
      await member.roles.remove(rolesToRemove, "ZKCred tier update");
    }

    // Assign the new tier role
    await member.roles.add(tierRole, "ZKCred credential verified");

    // ------------------------------------------------------------------
    // 4. Reply with a success embed
    // ------------------------------------------------------------------
    const embed = new EmbedBuilder()
      .setTitle(`${tierInfo.emoji} Credential Verified!`)
      .setColor(tierInfo.color)
      .addFields(
        { name: "Credential Type", value: credential.type, inline: true },
        {
          name: "Tier",
          value: `${tierInfo.emoji} ${tierInfo.name}`,
          inline: true,
        },
        { name: "Status", value: credential.status, inline: true },
        { name: "Role Assigned", value: `@${tierInfo.name}`, inline: true }
      )
      .setFooter({ text: `Credential ID: ${credential.id}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    console.log(
      `Verified ${interaction.user.tag} — ${tierInfo.name} (tier ${credential.tier})`
    );
  } catch (error) {
    console.error("Verification error:", error);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription(
            "An unexpected error occurred while verifying your credential. " +
              "Please try again later."
          )
          .setColor(0xe74c3c),
      ],
    });
  }
});

// ---------------------------------------------------------------------------
// Start the Bot
// ---------------------------------------------------------------------------

client.login(DISCORD_TOKEN);
