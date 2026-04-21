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
const VERIFIED_ROLE_NAME = 'Coder';

const commands = [
  new SlashCommandBuilder().setName('link').setDescription('Link your Repdox account'),
  new SlashCommandBuilder().setName('sync').setDescription('Sync team roles'),
  new SlashCommandBuilder().setName('setup-server').setDescription('Secure the server').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map(c => c.toJSON());

async function registerCommands(guildId: string) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId), { body: commands });
  } catch (error) { console.error(error); }
}

async function grantVerifiedRole(discordId: string) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) continue;
      let role = guild.roles.cache.find(r => r.name === VERIFIED_ROLE_NAME);
      if (!role) role = await guild.roles.create({ name: VERIFIED_ROLE_NAME, color: 'Purple', hoist: true });
      if (!member.roles.cache.has(role.id)) await member.roles.add(role);
    } catch (e) { console.error(e); }
  }
}

client.once(Events.ClientReady, c => {
  console.log(`🚀 Ready! Logged in as ${c.user.tag}`);
  c.user.setPresence({ status: 'online', activities: [{ name: 'Repdox', type: 3 }] });
  c.guilds.cache.forEach(guild => registerCommands(guild.id));
  
  supabase.channel('linked-users').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, async (p) => {
    if (p.new.discord_id) await grantVerifiedRole(p.new.discord_id);
  }).subscribe();
});

client.on(Events.MessageCreate, async m => {
  if (m.author.bot || !m.guild) return;

  const hasBannedLink = BANNED_LINKS.some(r => r.test(m.content));
  if (hasBannedLink && !m.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    try { await m.delete(); m.channel.send(`🚫 No invites, ${m.author}`); } catch (e) {}
    return;
  }

  const now = Date.now();
  const userMessages = (messageCache.get(m.author.id) || []).filter(ts => now - ts < SPAM_INTERVAL);
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

client.on(Events.InteractionCreate, async i => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName === 'link') {
    await i.deferReply({ ephemeral: true });
    const token = uuidv4();
    await supabase.from('discord_link_requests').insert({ token, discord_id: i.user.id, discord_username: i.user.tag });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel('Confirm Link').setURL(`${REPDOX_URL}/auth/discord-link?token=${token}`).setStyle(ButtonStyle.Link),
      new ButtonBuilder().setLabel('Create Account').setURL(`${REPDOX_URL}/signup`).setStyle(ButtonStyle.Link)
    );
    await i.editReply({ content: '🔗 Click below to link your account to get the **Coder** role.\n*Don\'t have an account? Click the register button first!*', components: [row] });
  } else if (i.commandName === 'sync') {
    await i.deferReply({ ephemeral: true });
    const guild = i.guild; if (!guild) return;
    try {
      const { data: p } = await supabase.from('user_profiles').select('user_id').eq('discord_id', i.user.id).single();
      if (!p) return i.editReply('❌ Not linked. Use `/link`.');
      await grantVerifiedRole(i.user.id);
      const { data: regs } = await supabase.from('event_registrations').select('events(title), event_teams(name)').eq('user_id', p.user_id);
      const member = i.member as GuildMember;
      let added: string[] = [];
      for (const reg of (regs as any[])) {
        if (reg.events?.title?.toLowerCase().includes('solve for india')) {
          let r = guild.roles.cache.find(ro => ro.name === 'Solve For India');
          if (!r) r = await guild.roles.create({ name: 'Solve For India', color: 'Orange' });
          if (!member.roles.cache.has(r.id)) { await member.roles.add(r); added.push('Solve For India'); }
        }
        if (reg.event_teams?.name) {
          let r = guild.roles.cache.find(ro => ro.name === reg.event_teams.name);
          if (!r) r = await guild.roles.create({ name: reg.event_teams.name, color: 'Blue' });
          if (!member.roles.cache.has(r.id)) { await member.roles.add(r); added.push(reg.event_teams.name); }
        }
      }
      await i.editReply(added.length ? `✅ Synced: ${added.join(', ')}` : 'ℹ️ Already up to date.');
    } catch (e) { await i.editReply('❌ Sync failed.'); }
  } else if (i.commandName === 'setup-server') {
    await i.deferReply({ ephemeral: true });
    const guild = i.guild; if (!guild) return;
    try {
      let coderRole = guild.roles.cache.find(r => r.name === VERIFIED_ROLE_NAME);
      if (!coderRole) coderRole = await guild.roles.create({ name: VERIFIED_ROLE_NAME, color: 'Purple', hoist: true });
      const ev = guild.roles.everyone;
      const channels = await guild.channels.fetch();
      const verifyChannelName = 'verify-here';

      for (const c of channels.values()) {
        if (!c) continue;
        try {
          if (c.name === verifyChannelName) {
            await c.permissionOverwrites.edit(ev, { ViewChannel: true, SendMessages: false });
            await c.permissionOverwrites.edit(coderRole, { ViewChannel: true, SendMessages: true });
          } else if (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildCategory) {
            await c.permissionOverwrites.edit(ev, { ViewChannel: false });
            await c.permissionOverwrites.edit(coderRole, { ViewChannel: true });
          }
        } catch (e) { console.warn(`Skipping ${c.name}`); }
      }

      let info = guild.channels.cache.find(c => c.name === verifyChannelName);
      if (!info) {
        info = await guild.channels.create({ name: verifyChannelName, type: ChannelType.GuildText, permissionOverwrites: [{ id: ev.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }] });
        await (info as any).send({ embeds: [{ title: '🔐 Access the Server', description: 'Welcome to Repdox! Type `/link` to verify.', color: 0x7c3aed }] });
      }
      await i.editReply('✅ Server Lockdown & Verification Gate active.');
    } catch (e) { await i.editReply('❌ Setup failed.'); }
  }
});

try {
  client.login(process.env.DISCORD_TOKEN);
} catch (e) {
  console.error("FATAL LOGIN ERROR:", e);
  process.exit(1);
}
