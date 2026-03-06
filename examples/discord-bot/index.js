
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

/** Per-credential-type config — must match CREDENTIAL_TIER_NAMES in credential.ts */
const CREDENTIAL_TIERS = {
  btc_tier:         { label: "BTC",        tiers: { 0: "Shrimp", 1: "Crab", 2: "Fish", 3: "Whale" },       color: 0xf7931a },
  wallet_age:       { label: "Wallet Age", tiers: { 0: "Newbie", 1: "Veteran", 2: "Hodler", 3: "OG" },     color: 0x9ca3af },
  eth_holder:       { label: "ETH",        tiers: { 0: "Dust", 1: "Holder", 2: "Stacker", 3: "Whale" },    color: 0x627eea },
  github_dev:       { label: "GitHub Dev", tiers: { 0: "Seedling", 1: "Hammer", 2: "Star", 3: "Trophy" },  color: 0x6e40c9 },
  codeforces_coder: { label: "Codeforces", tiers: { 0: "Newbie", 1: "Specialist", 2: "Expert", 3: "Master" }, color: 0x1f8dd6 },
  steam_gamer:      { label: "Steam",      tiers: { 0: "Casual", 1: "Gamer", 2: "Hardcore", 3: "Legend" }, color: 0x1b2838 },
  strava_athlete:   { label: "Strava",     tiers: { 0: "Sneaker", 1: "Runner", 2: "Mountain", 3: "Peak" }, color: 0xfc4c02 },
};

const TIER_EMOJIS = { 0: "\ud83c\udf31", 1: "\u2b50", 2: "\ud83d\udc8e", 3: "\ud83d\udc51" };

/** Lounge roles granted based on tier level (cumulative) */
const LOUNGE_ROLES = [
  { minTier: 0, name: "ZKCred Verified", emoji: "\u2705", color: 0x5b7fff },
  { minTier: 2, name: "Silver Lounge",   emoji: "\ud83e\ude99", color: 0xc0c0c0 },
  { minTier: 3, name: "Gold Lounge",     emoji: "\ud83d\udc51", color: 0xffd700 },
];

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

function getLoungeRoles(tier) {
  return LOUNGE_ROLES.filter((l) => tier >= l.minTier);
}

// ---------------------------------------------------------------------------
// Discord Client Setup
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// ---------------------------------------------------------------------------
// Slash Command Registration (on bot ready)
// ---------------------------------------------------------------------------

client.once("ready", async () => {
  console.log(`[Discord Bot] Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("verify")
      .setDescription("Verify a ZKCred credential and receive your tier role")
      .addStringOption((option) =>
        option
          .setName("credential_id")
          .setDescription("Your ZKCred credential ID (0x...)")
          .setRequired(true)
      ),
  ].map((cmd) => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
      body: commands,
    });
    console.log("[Discord Bot] Slash commands registered");
  } catch (error) {
    console.error("[Discord Bot] Failed to register slash commands:", error);
  }

  console.log(`[Discord Bot] Ready! Managing roles in guild ${GUILD_ID}`);
});

// ---------------------------------------------------------------------------
// Command Handler
// ---------------------------------------------------------------------------

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "verify") return;

  const credentialId = interaction.options.getString("credential_id", true);
  console.log(`[Discord Bot] /verify from ${interaction.user.tag} — credential: ${credentialId}`);

  await interaction.deferReply();

  try {
    const verifyUrl = `${ZKCRED_API_URL}/api/v1/credentials/${encodeURIComponent(credentialId)}/verify`;
    console.log(`[Discord Bot] Calling API: ${verifyUrl}`);

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "X-API-Key": ZKCRED_API_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log(`[Discord Bot] API response: ${response.status} ${response.statusText}`);

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
            .setColor(0xef4444),
        ],
      });
      return;
    }

    const data = await response.json();
    console.log(`[Discord Bot] API data:`, JSON.stringify(data));

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
            .setColor(0xef4444),
        ],
      });
      return;
    }

    // Credential is valid — assign roles
    const { credential } = data;
    const roleInfo = getRoleInfo(credential.type, credential.tier);
    console.log(`[Discord Bot] Verified! type=${credential.type} tier=${credential.tier} role=${roleInfo.name}`);

    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(interaction.user.id);

    const assignedRoles = [roleInfo.name];

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
      console.log(`[Discord Bot] Created role: ${roleInfo.name}`);
    }
    await member.roles.add(tierRole, "ZKCred credential verified");

    // Assign lounge access roles based on tier level
    const loungeRoles = getLoungeRoles(credential.tier);
    for (const lounge of loungeRoles) {
      if (member.roles.cache.some((r) => r.name === lounge.name)) continue;
      let loungeRole = guild.roles.cache.find((r) => r.name === lounge.name);
      if (!loungeRole) {
        loungeRole = await guild.roles.create({
          name: lounge.name,
          color: lounge.color,
          reason: "ZKCred lounge access",
        });
      }
      await member.roles.add(loungeRole);
      assignedRoles.push(lounge.name);
    }

    const embed = new EmbedBuilder()
      .setTitle(`${roleInfo.emoji} Credential Verified!`)
      .setColor(roleInfo.color)
      .addFields(
        { name: "Credential", value: credential.tierName ?? credential.type, inline: true },
        { name: "Role", value: `${roleInfo.emoji} ${roleInfo.name}`, inline: true },
        { name: "Status", value: credential.status, inline: true },
        { name: "Roles Assigned", value: assignedRoles.map((r) => `\u2022 ${r}`).join("\n"), inline: false }
      )
      .setFooter({ text: `Credential ID: ${credential.id}` })
      .setTimestamp();

    console.log(`[Discord Bot] Roles assigned to ${interaction.user.tag}: ${assignedRoles.join(", ")}`);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("[Discord Bot] Verify error:", error);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription(
            "An unexpected error occurred while verifying your credential. " +
              "Please try again later."
          )
          .setColor(0xef4444),
      ],
    });
  }
});

// ---------------------------------------------------------------------------
// Start the Bot
// ---------------------------------------------------------------------------

client.login(DISCORD_TOKEN);
