-- The Discord account-linking flow (repdox-discord-bot/index.ts's /link
-- command, src/pages/DiscordLink.tsx) has been live and functional, but
-- neither the discord_link_requests table nor user_profiles.discord_id/
-- discord_username were ever captured in a migration — same pattern as
-- the base schema generally (see docs/architecture/repository/README.md).
-- This was only discovered because src/pages/DiscordLink.tsx's queries
-- against these didn't type-check once `npm run typecheck` was actually
-- run correctly (see docs/architecture/PHASE11_COMPLIANCE_REPORT.md's
-- addendum) — the feature itself was already working in production.
--
-- IF NOT EXISTS / IF EXISTS guards throughout so this is safe to run
-- whether or not these already exist in a given environment.

create table if not exists public.discord_link_requests (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  discord_id text not null,
  discord_username text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists discord_link_requests_token_uidx
  on public.discord_link_requests(token);

alter table public.user_profiles
  add column if not exists discord_id text;
alter table public.user_profiles
  add column if not exists discord_username text;

create index if not exists user_profiles_discord_id_idx
  on public.user_profiles(discord_id) where discord_id is not null;
