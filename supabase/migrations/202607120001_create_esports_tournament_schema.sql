create extension if not exists "pgcrypto";

create table if not exists public.esports_tournaments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  game_name text not null default 'Valorant',
  tournament_type text not null default 'Single Elimination',
  max_teams integer default 16,
  current_teams integer default 0,
  status text not null default 'registration_open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.esports_tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.esports_tournaments(id) on delete cascade,
  team_name text not null,
  team_logo text,
  captain_id uuid,
  player_1 text,
  player_2 text,
  player_3 text,
  player_4 text,
  player_5 text,
  substitute_players text,
  riot_ids text,
  team_seed integer default 999,
  checked_in boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.esports_tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.esports_tournaments(id) on delete cascade,
  round_number integer not null,
  match_number integer not null,
  team_a_id uuid references public.esports_tournament_teams(id) on delete set null,
  team_b_id uuid references public.esports_tournament_teams(id) on delete set null,
  team_a_score integer,
  team_b_score integer,
  winner_id uuid references public.esports_tournament_teams(id) on delete set null,
  match_status text not null default 'upcoming',
  scheduled_time timestamptz,
  streamed_match boolean default false,
  vod_link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.esports_tournament_maps (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.esports_tournament_matches(id) on delete cascade,
  map_name text,
  team_a_score integer,
  team_b_score integer,
  winner text,
  map_order integer default 1
);

create index if not exists esports_tournaments_event_id_idx on public.esports_tournaments(event_id);
create index if not exists esports_tournament_teams_tournament_id_idx on public.esports_tournament_teams(tournament_id);
create index if not exists esports_tournament_matches_tournament_id_idx on public.esports_tournament_matches(tournament_id);
create index if not exists esports_tournament_maps_match_id_idx on public.esports_tournament_maps(match_id);
