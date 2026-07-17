-- Ticketing & QR Check-in System — RLS policies.
--
-- Model:
--   * A ticket's own registrant can read their own ticket (by registration
--     ownership) — this is what powers the /ticket/:token page for a
--     logged-in participant browsing their own tickets from the dashboard.
--     The :token route itself does NOT rely on RLS for access — the token
--     is looked up via api/tickets/get.ts using the service-role key, same
--     pattern as every other api/ route (see docs/api/README.md). RLS here
--     is the backstop for any direct client-side Supabase query.
--   * Event organisers (events.created_by) and users granted access via
--     event_staff may read/update tickets and scans for their own event.
--   * Global admins (checked at the API layer via IPermissionService, not
--     re-implemented in SQL) use the service-role key for admin API routes,
--     which bypasses RLS entirely — consistent with every other admin
--     capability in this codebase (see AdminEvents.tsx, AdminVolunteers.tsx).

alter table public.tickets enable row level security;
alter table public.ticket_scans enable row level security;
alter table public.event_staff enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tickets'
      and policyname = 'Registrant can view own ticket'
  ) then
    create policy "Registrant can view own ticket"
      on public.tickets
      for select
      using (
        exists (
          select 1 from public.event_registrations er
          where er.id = tickets.registration_id
            and er.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tickets'
      and policyname = 'Event staff can view event tickets'
  ) then
    create policy "Event staff can view event tickets"
      on public.tickets
      for select
      using (
        exists (
          select 1 from public.events e
          where e.id = tickets.event_id and e.created_by = auth.uid()
        )
        or exists (
          select 1 from public.event_staff es
          where es.event_id = tickets.event_id and es.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ticket_scans'
      and policyname = 'Event staff can view scan log'
  ) then
    create policy "Event staff can view scan log"
      on public.ticket_scans
      for select
      using (
        exists (
          select 1 from public.events e
          where e.id = ticket_scans.event_id and e.created_by = auth.uid()
        )
        or exists (
          select 1 from public.event_staff es
          where es.event_id = ticket_scans.event_id and es.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_staff'
      and policyname = 'Event owner manages staff list'
  ) then
    create policy "Event owner manages staff list"
      on public.event_staff
      for all
      using (
        exists (
          select 1 from public.events e
          where e.id = event_staff.event_id and e.created_by = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events e
          where e.id = event_staff.event_id and e.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_staff'
      and policyname = 'Staff member can see their own grants'
  ) then
    create policy "Staff member can see their own grants"
      on public.event_staff
      for select
      using (user_id = auth.uid());
  end if;
end $$;

-- All writes to tickets/ticket_scans (generation, check-in, cancel,
-- reissue) go through the SECURITY DEFINER RPC functions in
-- 202607160002_ticketing_rpc_functions.sql, which run with elevated
-- privilege and enforce their own invariants — no direct insert/update
-- policy is granted here, matching the read-only-via-RLS +
-- mutate-via-RPC pattern already used for event_registrations
-- (register_for_event) elsewhere in this schema.
