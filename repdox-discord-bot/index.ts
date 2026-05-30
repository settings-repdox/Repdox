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
  try {
    const { data: teams } = await supabase.from('event_teams').select('name');
    const teamNames = new Set((teams || []).map((t: any) => t.name).filter(Boolean));
    const managedRoles = new Set([VERIFIED_ROLE, SFI_ROLE, ...teamNames]);

    const { data: profile } = await supabase.from('user_profiles').select('user_id').eq('discord_id', discordId).maybeSingle();
    const expected = new Set<string>();

    if (profile) {
      expected.add(VERIFIED_ROLE);
      const { data: regs, error: regsError } = await supabase.from('event_registrations').select('events!event_registrations_event_id_fkey(title), event_teams(name)').eq('user_id', profile.user_id);
      if (regsError) console.error('[grantRoles] regsError:', regsError);
      
      for (const reg of ((regs ?? []) as any[])) {
        if (reg.events?.title?.toLowerCase().includes('solve for india')) {
          expected.add(SFI_ROLE);
        }
        if (reg.event_teams?.name) {
          expected.add(reg.event_teams.name);
        }
      }
    }

    for (const guild of client.guilds.cache.values()) {
      try {
        const member = await guild.members.fetch(discordId).catch(() => null);
        if (!member) continue;

        const rolesToAdd = [];
        for (const roleName of expected) {
          let roleColor = 'Blue';
          let hoist = false;
          if (roleName === VERIFIED_ROLE) {
            roleColor = 'Green';
            hoist = true;
          } else if (roleName === SFI_ROLE) {
            roleColor = 'Orange';
            hoist = true;
          }
          const r = await ensureRole(guild, roleName, roleColor, hoist);
          if (r && !member.roles.cache.has(r.id)) {
            rolesToAdd.push(r);
          }
        }

        const rolesToRemove = [];
        for (const role of member.roles.cache.values()) {
          if (managedRoles.has(role.name) && !expected.has(role.name)) {
            rolesToRemove.push(role);
          }
        }

        if (rolesToAdd.length > 0) await member.roles.add(rolesToAdd);
        if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove);
      } catch (e) {
        console.error(`Sync error in guild ${guild.name} for member ${discordId}:`, e);
      }
    }
  } catch (e) {
    console.error("Global sync fetch error:", e);
  }
}

async function autoSyncAllGuildMembers() {
  console.log("⏰ Starting periodic auto-sync...");
  try {
    const { data: teams } = await supabase.from('event_teams').select('name');
    const teamNames = new Set((teams || []).map((t: any) => t.name).filter(Boolean));
    const managedRoles = new Set([VERIFIED_ROLE, SFI_ROLE, ...teamNames]);

    const { data: profiles } = await supabase.from('user_profiles').select('user_id, discord_id').not('discord_id', 'is', null);
    const linkedProfiles = profiles || [];
    const userIdToDiscordId = new Map<string, string>();
    const expectedRolesByDiscordId = new Map<string, Set<string>>();

    for (const p of linkedProfiles) {
      userIdToDiscordId.set(p.user_id, p.discord_id);
      expectedRolesByDiscordId.set(p.discord_id, new Set([VERIFIED_ROLE]));
    }

    const { data: regs } = await supabase.from('event_registrations').select('user_id, events!event_registrations_event_id_fkey(title), event_teams(name)');
    for (const reg of ((regs ?? []) as any[])) {
      const discordId = userIdToDiscordId.get(reg.user_id);
      if (discordId) {
        const rolesSet = expectedRolesByDiscordId.get(discordId);
        if (rolesSet) {
          if (reg.events?.title?.toLowerCase().includes('solve for india')) {
            rolesSet.add(SFI_ROLE);
          }
          if (reg.event_teams?.name) {
            rolesSet.add(reg.event_teams.name);
          }
        }
      }
    }

    for (const guild of client.guilds.cache.values()) {
      try {
        const members = await guild.members.fetch();
        for (const member of members.values()) {
          if (member.user.bot) continue;

          const expected = expectedRolesByDiscordId.get(member.id) || new Set<string>();
          
          const rolesToAdd = [];
          for (const roleName of expected) {
            let roleColor = 'Blue';
            let hoist = false;
            if (roleName === VERIFIED_ROLE) {
              roleColor = 'Green';
              hoist = true;
            } else if (roleName === SFI_ROLE) {
              roleColor = 'Orange';
              hoist = true;
            }
            
            const r = await ensureRole(guild, roleName, roleColor, hoist);
            if (r && !member.roles.cache.has(r.id)) {
              rolesToAdd.push(r);
            }
          }

          const rolesToRemove = [];
          for (const role of member.roles.cache.values()) {
            if (managedRoles.has(role.name) && !expected.has(role.name)) {
              rolesToRemove.push(role);
            }
          }

          if (rolesToAdd.length > 0) {
            await member.roles.add(rolesToAdd);
            console.log(`+ Added roles to ${member.user.tag}: ${rolesToAdd.map(r => r.name).join(', ')}`);
          }
          if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove);
            console.log(`- Removed roles from ${member.user.tag}: ${rolesToRemove.map(r => r.name).join(', ')}`);
          }
        }
      } catch (e) {
        console.error(`Error syncing guild ${guild.name}:`, e);
      }
    }
  } catch (e) {
    console.error("Global auto-sync error:", e);
  }
  console.log("⏰ Periodic auto-sync complete!");
}

const announcedEvents = new Set<string>();

async function announceEvent(event: any) {
  if (announcedEvents.has(event.id)) return;
  announcedEvents.add(event.id);
  setTimeout(() => announcedEvents.delete(event.id), 600000);

  console.log(`📢 Announcing new active event: ${event.title}`);
  
  const title = event.title || 'New Event';
  const description = event.short_blurb || event.description || 'No description provided.';
  const location = event.location || 'Online';
  const startAt = event.start_at ? new Date(event.start_at).toLocaleString() : 'TBD';
  const eventUrl = `${REPDOX_URL}/events/${event.id}`;
  
  const announcementEmbed: any = {
    title: `📢 New Event: ${title}`,
    description: description,
    color: 0x7c3aed,
    fields: [
      { name: '📍 Location', value: location, inline: true },
      { name: '⏰ Date & Time', value: startAt, inline: true }
    ],
    url: eventUrl,
    footer: { text: 'Repdox — Think. Build. Transform.' },
    timestamp: new Date().toISOString()
  };

  if (event.image_url) {
    announcementEmbed.image = { url: event.image_url };
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('View Event & Register')
      .setURL(eventUrl)
      .setStyle(ButtonStyle.Link)
  );

  for (const guild of client.guilds.cache.values()) {
    try {
      const channel = guild.channels.cache.find((c: any) => 
        c.name.toLowerCase() === 'announcements' && 
        c.type === ChannelType.GuildText
      );

      if (channel) {
        await (channel as any).send({ embeds: [announcementEmbed], components: [row] });
        console.log(`Sent announcement to ${guild.name} in #${channel.name}`);
      } else {
        console.warn(`No 'announcements' text channel found in guild ${guild.name}`);
      }
    } catch (e) {
      console.error(`Error sending event announcement to guild ${guild.name}:`, e);
    }
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

  // Real-time: auto-announce new approved events
  supabase.channel('events-announce').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async (payload: any) => {
    const isNewActive = payload.new && payload.new.is_active && (!payload.old || !payload.old.is_active);
    if (isNewActive) {
      await announceEvent(payload.new);
    }
  }).subscribe();

  // Setup background auto-sync
  setTimeout(() => autoSyncAllGuildMembers(), 5000);
  setInterval(() => autoSyncAllGuildMembers(), 15 * 60 * 1000);
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
  }
});

try {
  client.login(process.env.DISCORD_TOKEN);
} catch (e) {
  console.error("FATAL LOGIN ERROR:", e);
  process.exit(1);
}
