import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ActivityType
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const messageCache = new Map<string, number[]>();
const SPAM_THRESHOLD = 5;
const SPAM_INTERVAL = 5000;
const BANNED_LINKS = [/discord\.gg\//i, /discord\.com\/invite\//i];

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent 
  ] 
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REPDOX_URL = 'https://repdox.com';
const VERIFIED_ROLE = 'Verified';
const SFI_ROLE = 'Solve For India';

const commands = [
  new SlashCommandBuilder().setName('link').setDescription('Link your Repdox account & verify'),
  new SlashCommandBuilder().setName('sync').setDescription('Sync your event roles'),
  new SlashCommandBuilder().setName('setup-server').setDescription('Set up community server structure').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((c: any) => c.toJSON());

async function registerCommands(guildId: string) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId), { body: commands });
  } catch (error) { console.error(error); }
}

// Ensure a role exists, create if missing
async function ensureRole(guild: any, name: string, color: string, hoist = false) {
  let role = guild.roles.cache.find((r: any) => r.name === name);
  if (!role) role = await guild.roles.create({ name, color, hoist });
  return role;
}

// Grant Verified + event roles based on DB data
async function grantRolesOnLink(discordId: string) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) continue;

      // 1. Always grant Verified
      const verifiedRole = await ensureRole(guild, VERIFIED_ROLE, 'Green', true);
      if (!member.roles.cache.has(verifiedRole.id)) await member.roles.add(verifiedRole);

      // 2. Check if registered for Solve For India
      const { data: profile } = await supabase.from('user_profiles').select('user_id').eq('discord_id', discordId).maybeSingle();
      if (!profile) continue;

      const { data: regs } = await supabase.from('event_registrations').select('events(title), event_teams(name)').eq('user_id', profile.user_id);
      for (const reg of ((regs ?? []) as any[])) {
        if (reg.events?.title?.toLowerCase().includes('solve for india')) {
          const sfiRole = await ensureRole(guild, SFI_ROLE, 'Orange', true);
          if (!member.roles.cache.has(sfiRole.id)) await member.roles.add(sfiRole);
        }
        if (reg.event_teams?.name) {
          const teamRole = await ensureRole(guild, reg.event_teams.name, 'Blue');
          if (!member.roles.cache.has(teamRole.id)) await member.roles.add(teamRole);
        }
      }
    } catch (e) { console.error('[grantRoles]', e); }
  }
}

// ── Bot Ready ──
client.once(Events.ClientReady, (c: any) => {
  console.log(`🚀 Ready! Logged in as ${c.user.tag}`);
  c.user.setPresence({ status: 'online', activities: [{ name: 'Repdox Community', type: 3 }] });
  c.guilds.cache.forEach((guild: any) => registerCommands(guild.id));
  
  // Real-time: auto-grant roles when someone links on the website
  supabase.channel('linked-users').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, async (p: any) => {
    if (p.new.discord_id) await grantRolesOnLink(p.new.discord_id);
  }).subscribe();
});

// ── Anti-Spam & Auto-Mod ──
client.on(Events.MessageCreate, async (m: any) => {
  if (m.author.bot || !m.guild) return;

  const hasBannedLink = BANNED_LINKS.some((r: any) => r.test(m.content));
  if (hasBannedLink && !m.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    try { await m.delete(); m.channel.send({ content: `🚫 No invites, ${m.author}` }).then((msg: any) => setTimeout(() => msg.delete(), 5000)); } catch (e) {}
    return;
  }

  const now = Date.now();
  const userMessages = (messageCache.get(m.author.id) || []).filter((ts: number) => now - ts < SPAM_INTERVAL);
  userMessages.push(now);
  messageCache.set(m.author.id, userMessages);

  if (userMessages.length > SPAM_THRESHOLD && !m.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    try {
      await m.delete();
      if (userMessages.length === SPAM_THRESHOLD + 1) {
        await m.member?.timeout(60000, 'Spamming');
        await m.channel.send(`🤐 ${m.author} timed out for spam.`);
      }
    } catch (e) {}
  }
});

// ── Slash Commands ──
client.on(Events.InteractionCreate, async (i: any) => {
  if (!i.isChatInputCommand()) return;

  // ── /link ──
  if (i.commandName === 'link') {
    await i.deferReply({ ephemeral: true });
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabase.from('discord_link_requests').insert({ token, discord_id: i.user.id, discord_username: i.user.tag, expires_at: expiresAt });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel('✅ Verify & Link').setURL(`${REPDOX_URL}/auth/discord-link?token=${token}`).setStyle(ButtonStyle.Link),
      new ButtonBuilder().setLabel('📝 Create Account').setURL(`${REPDOX_URL}/signup`).setStyle(ButtonStyle.Link)
    );
    await i.editReply({ content: '🔐 **Verify your identity** to access the server.\n\n> Already have a Repdox account? Click **Verify & Link**.\n> New here? Click **Create Account** first, then come back and run `/link` again.', components: [row] });

  // ── /sync ──
  } else if (i.commandName === 'sync') {
    await i.deferReply({ ephemeral: true });
    const guild = i.guild; if (!guild) return;
    try {
      const { data: p, error: profileError } = await supabase.from('user_profiles').select('user_id').eq('discord_id', i.user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!p) return i.editReply('❌ Your Discord is not linked yet. Use `/link` first.');

      await grantRolesOnLink(i.user.id);
      await i.editReply('✅ Roles synced! Check your profile — any event roles have been added.');
    } catch (e) { console.error('[sync]', e); await i.editReply('❌ Sync failed.'); }

  // ── /setup-server ──
  } else if (i.commandName === 'setup-server') {
    await i.deferReply({ ephemeral: true });
    const guild = i.guild; if (!guild) return;
    try {
      const ev = guild.roles.everyone;
      const verifiedRole = await ensureRole(guild, VERIFIED_ROLE, 'Green', true);
      const sfiRole = await ensureRole(guild, SFI_ROLE, 'Orange', true);

      // ── Create category: SOLVE FOR INDIA (only SFI role can see) ──
      let sfiCategory = guild.channels.cache.find((c: any) => c.name === '── Solve For India ──' && c.type === ChannelType.GuildCategory);
      if (!sfiCategory) {
        sfiCategory = await guild.channels.create({
          name: '── Solve For India ──', type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: ev.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: sfiRole.id, allow: [PermissionFlagsBits.ViewChannel] }
          ]
        });
        // Create SFI-specific channels
        for (const name of ['sfi-announcements', 'sfi-general', 'sfi-teams', 'sfi-submissions']) {
          await guild.channels.create({ name, type: ChannelType.GuildText, parent: sfiCategory.id });
        }
        await guild.channels.create({ name: 'SFI Voice', type: ChannelType.GuildVoice, parent: sfiCategory.id });
      }

      // ── Lock all existing channels for @everyone, open for Verified ──
      const channels = await guild.channels.fetch();
      const verifyChannelName = 'verify-here';

      for (const c of channels.values()) {
        if (!c) continue;
        try {
          if (c.name === verifyChannelName) continue; // skip verify channel
          if (c.name?.startsWith('sfi-') || c.name === 'SFI Voice' || c.name === '── Solve For India ──') continue; // skip SFI channels
          if (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildCategory) {
            await (c as any).permissionOverwrites.edit(ev, { ViewChannel: false });
            await (c as any).permissionOverwrites.edit(verifiedRole, { ViewChannel: true });
          }
        } catch (e) { console.warn(`Skipping ${c.name}`); }
      }

      // ── Create #verify-here ──
      let info = guild.channels.cache.find((c: any) => c.name === verifyChannelName);
      if (!info) {
        info = await guild.channels.create({
          name: verifyChannelName, type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: ev.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
            { id: verifiedRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
          ]
        });
      }
      await (info as any).send({ embeds: [{
        title: '🔐 Welcome to the Repdox Community',
        description: '**This server requires verification.**\n\nTo unlock all channels:\n1. Type `/link`\n2. Click **Verify & Link** and sign in to your Repdox account\n3. You will automatically receive the **Verified** role ✅\n\n🏆 **Registered for Solve For India?**\nYour hackathon channels will unlock automatically after verification!',
        color: 0x7c3aed,
        footer: { text: 'Repdox — Think. Build. Transform.' }
      }] });

      await i.editReply('✅ Community server setup complete!\n• **Verified** role created (unlocks general channels)\n• **Solve For India** category + channels created (unlocks for registered participants)\n• **#verify-here** gate active');
    } catch (e) { console.error('[setup]', e); await i.editReply('❌ Setup failed.'); }
  }
});

try {
  client.login(process.env.DISCORD_TOKEN);
} catch (e) {
  console.error("FATAL LOGIN ERROR:", e);
  process.exit(1);
}
