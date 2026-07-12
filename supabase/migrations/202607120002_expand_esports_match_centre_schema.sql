alter table public.esports_tournament_matches
  add column if not exists stream_platform text,
  add column if not exists stream_url text,
  add column if not exists embed_url text,
  add column if not exists creator_name text,
  add column if not exists creator_logo text,
  add column if not exists stream_link text,
  add column if not exists platform text,
  add column if not exists stage_label text,
  add column if not exists match_format text,
  add column if not exists timeline text,
  add column if not exists veto_details text,
  add column if not exists map_veto text;

alter table public.esports_tournament_maps
  add column if not exists map_status text;

create table if not exists public.esports_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.esports_tournament_teams(id) on delete cascade,
  player_name text not null,
  role text,
  riot_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.esports_player_match_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.esports_tournament_matches(id) on delete cascade,
  player_id uuid references public.esports_players(id) on delete cascade,
  map_id uuid references public.esports_tournament_maps(id) on delete cascade,
  player_name text,
  role text,
  kills integer default 0,
  deaths integer default 0,
  assists integer default 0,
  acs numeric default 0,
  adr numeric default 0,
  hs_percentage numeric default 0,
  first_kills integer default 0,
  plants integer default 0,
  defuses integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(match_id, player_id, map_id)
);

create index if not exists esports_players_team_id_idx on public.esports_players(team_id);
create index if not exists esports_player_match_stats_match_id_idx on public.esports_player_match_stats(match_id);
create index if not exists esports_player_match_stats_player_id_idx on public.esports_player_match_stats(player_id);
