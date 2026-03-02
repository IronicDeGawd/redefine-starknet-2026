/**
 * ZKCred Discord Bot — embedded in the Next.js server
 *
 * Starts automatically when DISCORD_TOKEN is set.
 * Registers /verify slash command and assigns tier-based roles.
 *
 * discord.js is imported dynamically (inside startDiscordBot) to prevent
 * Turbopack from tracing and mangling the module name at bundle time.
 * Without this, the production server crash-loops with
 * "Cannot find module 'discord.js-<hash>'" even when the bot is disabled.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ZKCRED_API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const ZKCRED_API_KEY = process.env.ZKCRED_DISCORD_API_KEY || "";

/** Per-credential-type config for Discord roles — must match CREDENTIAL_TIER_NAMES in credential.ts */
const CREDENTIAL_TIERS: Record<string, { label: string; tiers: Record<number, string>; color: number }> = {
  btc_tier:         { label: "BTC",        tiers: { 0: "Shrimp", 1: "Crab", 2: "Fish", 3: "Whale" },       color: 0xf7931a },
  wallet_age:       { label: "Wallet Age", tiers: { 0: "Newbie", 1: "Veteran", 2: "Hodler", 3: "OG" },     color: 0x9ca3af },
  eth_holder:       { label: "ETH",        tiers: { 0: "Dust", 1: "Holder", 2: "Stacker", 3: "Whale" },    color: 0x627eea },
  github_dev:       { label: "GitHub Dev", tiers: { 0: "Seedling", 1: "Hammer", 2: "Star", 3: "Trophy" },  color: 0x6e40c9 },
  codeforces_coder: { label: "Codeforces", tiers: { 0: "Newbie", 1: "Specialist", 2: "Expert", 3: "Master" }, color: 0x1f8dd6 },
  steam_gamer:      { label: "Steam",      tiers: { 0: "Casual", 1: "Gamer", 2: "Hardcore", 3: "Legend" }, color: 0x1b2838 },
  strava_athlete:   { label: "Strava",     tiers: { 0: "Sneaker", 1: "Runner", 2: "Mountain", 3: "Peak" }, color: 0xfc4c02 },
};

const TIER_EMOJIS: Record<number, string> = {
  0: "\u{1F331}", // 🌱
  1: "\u{2B50}",  // ⭐
  2: "\u{1F48E}", // 💎
  3: "\u{1F451}", // 👑
};

/** Lounge roles granted based on tier level (cumulative) */
const LOUNGE_ROLES: { minTier: number; name: string; emoji: string; color: number }[] = [
  { minTier: 0, name: "ZKCred Verified", emoji: "\u{2705}", color: 0x5b7fff },  // ✅
  { minTier: 2, name: "Silver Lounge",   emoji: "\u{1FA99}", color: 0xc0c0c0 }, // 🪙
  { minTier: 3, name: "Gold Lounge",     emoji: "\u{1F451}", color: 0xffd700 },  // 👑
];

function getRoleInfo(credentialType: string, tier: number): { name: string; emoji: string; color: number } {
  const config = CREDENTIAL_TIERS[credentialType];
  const tierName = config?.tiers[tier] ?? `Tier ${tier}`;
  const label = config?.label ?? credentialType;
  return {
    name: `${label}: ${tierName}`,
    emoji: TIER_EMOJIS[tier] ?? "\u{2728}",
    color: config?.color ?? 0x5b7fff,
  };
}

function getLoungeRoles(tier: number): typeof LOUNGE_ROLES {
  return LOUNGE_ROLES.filter((l) => tier >= l.minTier);
}

// ---------------------------------------------------------------------------
// Singleton guard — prevent multiple bot instances
// ---------------------------------------------------------------------------

let botStarted = false;

// ---------------------------------------------------------------------------
// Boot — all discord.js usage is inside this function behind dynamic import
// ---------------------------------------------------------------------------

export async function startDiscordBot() {
  if (botStarted) return;
  if (!DISCORD_TOKEN) {
    console.log("[Discord Bot] DISCORD_TOKEN not set — bot disabled");
    return;
  }

  botStarted = true;

  try {
    // Dynamic import — only loaded when the bot is actually starting
    const {
      Client,
      GatewayIntentBits,
      EmbedBuilder,
      REST,
      Routes,
      SlashCommandBuilder,
    } = await import("discord.js");

    // ----- Register slash commands -----
    if (DISCORD_CLIENT_ID) {
      const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
      const commands = [
        new SlashCommandBuilder()
          .setName("verify")
          .setDescription("Verify a ZKCred credential and receive your tier role")
          .addStringOption((opt) =>
            opt
              .setName("credential_id")
              .setDescription("Your ZKCred credential ID (0x...)")
              .setRequired(true)
          ),
      ].map((cmd) => cmd.toJSON());

      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
      console.log("[Discord Bot] Slash commands registered");
    }

    // ----- Verify handler -----
    async function handleVerify(interaction: import("discord.js").ChatInputCommandInteraction) {
      const credentialId = interaction.options.getString("credential_id", true);
      await interaction.deferReply();

      try {
        const res = await fetch(
          `${ZKCRED_API_URL}/api/v1/credentials/${credentialId}/verify`,
          {
            method: "POST",
            headers: {
              "X-API-Key": ZKCRED_API_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await res.json();

        if (!data.valid) {
          const reason =
            data.reason === "not_found"
              ? "Credential not found"
              : data.reason === "revoked"
                ? "Credential has been revoked"
                : "Verification failed";

          const embed = new EmbedBuilder()
            .setTitle("Verification Failed")
            .setDescription(reason)
            .setColor(0xef4444);

          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const roleInfo = getRoleInfo(data.credential.type, data.credential.tier);

        const member = interaction.guild?.members.cache.get(interaction.user.id) ??
          (await interaction.guild?.members.fetch(interaction.user.id));

        const assignedRoles: string[] = [roleInfo.name];

        if (member && interaction.guild) {
          // Remove old tier roles for this credential type
          const config = CREDENTIAL_TIERS[data.credential.type];
          const typeLabel = config?.label ?? data.credential.type;
          const rolesToRemove = member.roles.cache.filter((r) =>
            r.name.startsWith(`${typeLabel}: `)
          );
          for (const [, role] of rolesToRemove) {
            await member.roles.remove(role);
          }

          // Assign tier-specific role (e.g. "BTC: Shrimp")
          let targetRole = interaction.guild.roles.cache.find(
            (r) => r.name === roleInfo.name
          );
          if (!targetRole) {
            targetRole = await interaction.guild.roles.create({
              name: roleInfo.name,
              color: roleInfo.color,
              reason: "ZKCred tier role",
            });
          }
          await member.roles.add(targetRole);

          // Assign lounge access roles based on tier level
          const loungeRoles = getLoungeRoles(data.credential.tier);
          for (const lounge of loungeRoles) {
            if (member.roles.cache.some((r) => r.name === lounge.name)) continue;
            let loungeRole = interaction.guild.roles.cache.find(
              (r) => r.name === lounge.name
            );
            if (!loungeRole) {
              loungeRole = await interaction.guild.roles.create({
                name: lounge.name,
                color: lounge.color,
                reason: "ZKCred lounge access",
              });
            }
            await member.roles.add(loungeRole);
            assignedRoles.push(lounge.name);
          }
        }

        const embed = new EmbedBuilder()
          .setTitle(`${roleInfo.emoji} Credential Verified!`)
          .setDescription(`Welcome to **${roleInfo.name}**`)
          .addFields(
            { name: "Credential", value: data.credential.tierName ?? data.credential.type, inline: true },
            { name: "Role", value: `${roleInfo.emoji} ${roleInfo.name}`, inline: true },
            { name: "Status", value: data.credential.status, inline: true },
            { name: "Roles Assigned", value: assignedRoles.map((r) => `\u2022 ${r}`).join("\n"), inline: false }
          )
          .setColor(roleInfo.color);

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error("[Discord Bot] Verify error:", err);
        await interaction.editReply({
          content: "An error occurred while verifying. Please try again.",
        });
      }
    }

    // ----- Start client -----
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    });

    client.once("ready", (c) => {
      console.log(`[Discord Bot] Logged in as ${c.user.tag}`);
      if (GUILD_ID) {
        console.log(`[Discord Bot] Managing roles in guild ${GUILD_ID}`);
      }
    });

    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName === "verify") {
        await handleVerify(interaction);
      }
    });

    await client.login(DISCORD_TOKEN);
  } catch (err) {
    console.error("[Discord Bot] Failed to start:", err);
    botStarted = false;
  }
}
