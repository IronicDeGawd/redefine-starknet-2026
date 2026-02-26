/**
 * ZKCred Discord Bot — embedded in the Next.js server
 *
 * Starts automatically when DISCORD_TOKEN is set.
 * Registers /verify slash command and assigns tier-based roles.
 */

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ZKCRED_API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const ZKCRED_API_KEY = process.env.ZKCRED_DISCORD_API_KEY || "";

const TIER_ROLES: Record<number, { name: string; emoji: string; color: number }> = {
  0: { name: "Shrimp", emoji: "\u{1F990}", color: 0x9ca3af },
  1: { name: "Crab", emoji: "\u{1F980}", color: 0xf59e0b },
  2: { name: "Fish", emoji: "\u{1F41F}", color: 0x3b82f6 },
  3: { name: "Whale", emoji: "\u{1F40B}", color: 0x8b5cf6 },
};

const TIER_ROLE_NAMES = Object.values(TIER_ROLES).map((t) => t.name);

// ---------------------------------------------------------------------------
// Singleton guard — prevent multiple bot instances
// ---------------------------------------------------------------------------

let botStarted = false;

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

async function registerCommands() {
  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) return;

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

// ---------------------------------------------------------------------------
// Verify handler
// ---------------------------------------------------------------------------

async function handleVerify(interaction: ChatInputCommandInteraction) {
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

    // Assign role
    const tier = TIER_ROLES[data.credential.tier];
    if (!tier) {
      await interaction.editReply({ content: "Unknown tier received." });
      return;
    }

    const member = interaction.guild?.members.cache.get(interaction.user.id) ??
      (await interaction.guild?.members.fetch(interaction.user.id));

    if (member && interaction.guild) {
      // Remove existing tier roles
      const rolesToRemove = member.roles.cache.filter((r) =>
        TIER_ROLE_NAMES.includes(r.name)
      );
      for (const [, role] of rolesToRemove) {
        await member.roles.remove(role);
      }

      // Find or create the tier role
      let targetRole = interaction.guild.roles.cache.find(
        (r) => r.name === tier.name
      );
      if (!targetRole) {
        targetRole = await interaction.guild.roles.create({
          name: tier.name,
          color: tier.color,
          reason: "ZKCred tier role",
        });
      }

      await member.roles.add(targetRole);
    }

    const embed = new EmbedBuilder()
      .setTitle(`${tier.emoji} Credential Verified!`)
      .setDescription(`Welcome to the **${tier.name}** tier`)
      .addFields(
        { name: "Type", value: data.credential.type, inline: true },
        { name: "Tier", value: `${tier.emoji} ${tier.name}`, inline: true },
        { name: "Status", value: data.credential.status, inline: true }
      )
      .setColor(tier.color);

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[Discord Bot] Verify error:", err);
    await interaction.editReply({
      content: "An error occurred while verifying. Please try again.",
    });
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

export async function startDiscordBot() {
  if (botStarted) return;
  if (!DISCORD_TOKEN) {
    console.log("[Discord Bot] DISCORD_TOKEN not set — bot disabled");
    return;
  }

  botStarted = true;

  try {
    await registerCommands();

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
