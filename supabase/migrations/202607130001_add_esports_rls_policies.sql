-- This migration adds row-level security policies for esports tables.
-- RLS must be enabled on these tables, but without policies inserts/selects/updates/deletes are denied.

alter table public.esports_tournaments enable row level security;
alter table public.esports_tournament_teams enable row level security;
alter table public.esports_tournament_matches enable row level security;
alter table public.esports_tournament_maps enable row level security;
alter table public.esports_players enable row level security;
alter table public.esports_player_match_stats enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournaments'
      and policyname = 'Allow select on esports_tournaments'
  ) then
    create policy "Allow select on esports_tournaments"
      on public.esports_tournaments
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_teams'
      and policyname = 'Allow select on esports_tournament_teams'
  ) then
    create policy "Allow select on esports_tournament_teams"
      on public.esports_tournament_teams
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_matches'
      and policyname = 'Allow select on esports_tournament_matches'
  ) then
    create policy "Allow select on esports_tournament_matches"
      on public.esports_tournament_matches
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_maps'
      and policyname = 'Allow select on esports_tournament_maps'
  ) then
    create policy "Allow select on esports_tournament_maps"
      on public.esports_tournament_maps
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_players'
      and policyname = 'Allow select on esports_players'
  ) then
    create policy "Allow select on esports_players"
      on public.esports_players
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_player_match_stats'
      and policyname = 'Allow select on esports_player_match_stats'
  ) then
    create policy "Allow select on esports_player_match_stats"
      on public.esports_player_match_stats
      for select
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournaments'
      and policyname = 'Authenticated owners can insert tournaments'
  ) then
    create policy "Authenticated owners can insert tournaments"
      on public.esports_tournaments
      for insert
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.events e
          where e.id = event_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournaments'
      and policyname = 'Authenticated owners can update tournaments'
  ) then
    create policy "Authenticated owners can update tournaments"
      on public.esports_tournaments
      for update
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.events e
          where e.id = event_id and e.created_by = auth.uid()
        )
      )
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.events e
          where e.id = event_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournaments'
      and policyname = 'Authenticated owners can delete tournaments'
  ) then
    create policy "Authenticated owners can delete tournaments"
      on public.esports_tournaments
      for delete
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.events e
          where e.id = event_id and e.created_by = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_teams'
      and policyname = 'Authenticated owners can insert teams'
  ) then
    create policy "Authenticated owners can insert teams"
      on public.esports_tournament_teams
      for insert
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournaments t
          join public.events e on e.id = t.event_id
          where t.id = tournament_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_teams'
      and policyname = 'Authenticated owners can update teams'
  ) then
    create policy "Authenticated owners can update teams"
      on public.esports_tournament_teams
      for update
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournaments t
          join public.events e on e.id = t.event_id
          where t.id = tournament_id and e.created_by = auth.uid()
        )
      )
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournaments t
          join public.events e on e.id = t.event_id
          where t.id = tournament_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_teams'
      and policyname = 'Authenticated owners can delete teams'
  ) then
    create policy "Authenticated owners can delete teams"
      on public.esports_tournament_teams
      for delete
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournaments t
          join public.events e on e.id = t.event_id
          where t.id = tournament_id and e.created_by = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_matches'
      and policyname = 'Authenticated owners can insert matches'
  ) then
    create policy "Authenticated owners can insert matches"
      on public.esports_tournament_matches
      for insert
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournaments t
          join public.events e on e.id = t.event_id
          where t.id = tournament_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_matches'
      and policyname = 'Authenticated owners can update matches'
  ) then
    create policy "Authenticated owners can update matches"
      on public.esports_tournament_matches
      for update
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournaments t
          join public.events e on e.id = t.event_id
          where t.id = tournament_id and e.created_by = auth.uid()
        )
      )
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournaments t
          join public.events e on e.id = t.event_id
          where t.id = tournament_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_matches'
      and policyname = 'Authenticated owners can delete matches'
  ) then
    create policy "Authenticated owners can delete matches"
      on public.esports_tournament_matches
      for delete
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournaments t
          join public.events e on e.id = t.event_id
          where t.id = tournament_id and e.created_by = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_maps'
      and policyname = 'Authenticated owners can insert maps'
  ) then
    create policy "Authenticated owners can insert maps"
      on public.esports_tournament_maps
      for insert
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_matches m
          join public.esports_tournaments t on t.id = m.tournament_id
          join public.events e on e.id = t.event_id
          where m.id = match_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_maps'
      and policyname = 'Authenticated owners can update maps'
  ) then
    create policy "Authenticated owners can update maps"
      on public.esports_tournament_maps
      for update
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_matches m
          join public.esports_tournaments t on t.id = m.tournament_id
          join public.events e on e.id = t.event_id
          where m.id = match_id and e.created_by = auth.uid()
        )
      )
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_matches m
          join public.esports_tournaments t on t.id = m.tournament_id
          join public.events e on e.id = t.event_id
          where m.id = match_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_tournament_maps'
      and policyname = 'Authenticated owners can delete maps'
  ) then
    create policy "Authenticated owners can delete maps"
      on public.esports_tournament_maps
      for delete
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_matches m
          join public.esports_tournaments t on t.id = m.tournament_id
          join public.events e on e.id = t.event_id
          where m.id = match_id and e.created_by = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_players'
      and policyname = 'Authenticated owners can insert players'
  ) then
    create policy "Authenticated owners can insert players"
      on public.esports_players
      for insert
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_teams tt
          join public.esports_tournaments t on t.id = tt.tournament_id
          join public.events e on e.id = t.event_id
          where tt.id = team_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_players'
      and policyname = 'Authenticated owners can update players'
  ) then
    create policy "Authenticated owners can update players"
      on public.esports_players
      for update
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_teams tt
          join public.esports_tournaments t on t.id = tt.tournament_id
          join public.events e on e.id = t.event_id
          where tt.id = team_id and e.created_by = auth.uid()
        )
      )
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_teams tt
          join public.esports_tournaments t on t.id = tt.tournament_id
          join public.events e on e.id = t.event_id
          where tt.id = team_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_players'
      and policyname = 'Authenticated owners can delete players'
  ) then
    create policy "Authenticated owners can delete players"
      on public.esports_players
      for delete
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_teams tt
          join public.esports_tournaments t on t.id = tt.tournament_id
          join public.events e on e.id = t.event_id
          where tt.id = team_id and e.created_by = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_player_match_stats'
      and policyname = 'Authenticated owners can insert player match stats'
  ) then
    create policy "Authenticated owners can insert player match stats"
      on public.esports_player_match_stats
      for insert
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_matches m
          join public.esports_tournaments t on t.id = m.tournament_id
          join public.events e on e.id = t.event_id
          where m.id = match_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_player_match_stats'
      and policyname = 'Authenticated owners can update player match stats'
  ) then
    create policy "Authenticated owners can update player match stats"
      on public.esports_player_match_stats
      for update
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_matches m
          join public.esports_tournaments t on t.id = m.tournament_id
          join public.events e on e.id = t.event_id
          where m.id = match_id and e.created_by = auth.uid()
        )
      )
      with check (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_matches m
          join public.esports_tournaments t on t.id = m.tournament_id
          join public.events e on e.id = t.event_id
          where m.id = match_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'esports_player_match_stats'
      and policyname = 'Authenticated owners can delete player match stats'
  ) then
    create policy "Authenticated owners can delete player match stats"
      on public.esports_player_match_stats
      for delete
      using (
        auth.role() = 'authenticated' and exists(
          select 1
          from public.esports_tournament_matches m
          join public.esports_tournaments t on t.id = m.tournament_id
          join public.events e on e.id = t.event_id
          where m.id = match_id and e.created_by = auth.uid()
        )
      );
  end if;
end
$$;
