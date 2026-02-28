/**
 * ZKCred Discord Bot
 *
 * Verifies ZKCred credentials via the public API and assigns Discord roles
 * based on the holder's credential type and tier (e.g. "GitHub Dev: Star").
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
 * Per-credential-type tier config.
 * Role names are prefixed with the type label to avoid collisions.
 */
const CREDENTIAL_TIERS = {
  btc_tier:         { label: "BTC",        tiers: { 0: "Shrimp", 1: "Crab", 2: "Fish", 3: "Whale" },       color: 0xf7931a },
  wallet_age:       { label: "Wallet Age", tiers: { 0: "Newbie", 1: "Veteran", 2: "Hodler", 3: "OG" },     color: 0x9ca3af },
  eth_holder:       { label: "ETH",        tiers: { 0: "Dust", 1: "Shard", 2: "Diamond", 3: "Whale" },     color: 0x627eea },
  github_dev:       { label: "GitHub Dev", tiers: { 0: "Seedling", 1: "Hammer", 2: "Star", 3: "Trophy" },  color: 0x6e40c9 },
  codeforces_coder: { label: "Codeforces", tiers: { 0: "Newbie", 1: "Specialist", 2: "Expert", 3: "Master" }, color: 0x1f8dd6 },
  steam_gamer:      { label: "Steam",      tiers: { 0: "Basic", 1: "Intermediate", 2: "Advanced", 3: "Elite" }, color: 0x1b2838 },
  strava_athlete:   { label: "Strava",     tiers: { 0: "Sneaker", 1: "Runner", 2: "Mountain", 3: "Peak" }, color: 0xfc4c02 },
};

const TIER_EMOJIS = { 0: "\ud83c\udf31", 1: "\u2b50", 2: "\ud83d\udc8e", 3: "\ud83d\udc51" };

function getRoleInfo(credentialType, tier) {
  const config = CREDENTIAL_TIERS[credentialType];
  const tierName = config?.tiers[tier] ?? `Tier ${tier}`;
  const label = config?.label ?? credentialType;
  return {
    name: `${label}: ${tierName}`,
    emoji: TIER_EMOJIS[tier] ?? "\u2728",
    color: config?.color ?? 0x5b7fff,
  };
}

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
    const roleInfo = getRoleInfo(credential.type, credential.tier);

    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(interaction.user.id);

    // Remove existing roles for this credential type
    const config = CREDENTIAL_TIERS[credential.type];
    const typeLabel = config?.label ?? credential.type;
    const rolesToRemove = member.roles.cache.filter((r) =>
      r.name.startsWith(`${typeLabel}: `)
    );
    if (rolesToRemove.size > 0) {
      await member.roles.remove(rolesToRemove, "ZKCred tier update");
    }

    // Find or create the tier role
    let tierRole = guild.roles.cache.find((r) => r.name === roleInfo.name);
    if (!tierRole) {
      tierRole = await guild.roles.create({
        name: roleInfo.name,
        color: roleInfo.color,
        reason: "ZKCred tier role (auto-created)",
      });
      console.log(`Created role: ${roleInfo.name}`);
    }

    // Assign the new tier role
    await member.roles.add(tierRole, "ZKCred credential verified");

    // ------------------------------------------------------------------
    // 4. Reply with a success embed
    // ------------------------------------------------------------------
    const embed = new EmbedBuilder()
      .setTitle(`${roleInfo.emoji} Credential Verified!`)
      .setColor(roleInfo.color)
      .addFields(
        { name: "Credential Type", value: credential.tierName ?? credential.type, inline: true },
        {
          name: "Tier",
          value: `${roleInfo.emoji} ${roleInfo.name}`,
          inline: true,
        },
        { name: "Status", value: credential.status, inline: true },
        { name: "Role Assigned", value: `@${roleInfo.name}`, inline: true }
      )
      .setFooter({ text: `Credential ID: ${credential.id}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    console.log(
      `Verified ${interaction.user.tag} — ${roleInfo.name} (tier ${credential.tier})`
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
