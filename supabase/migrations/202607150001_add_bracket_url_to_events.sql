-- The Gaming/Tournament "Save bracket link" feature (src/pages/EventTournament.tsx,
-- handleSaveBracket) writes to events.bracket_url, but this column was never
-- created in the database. That's why saving a bracket URL throws a Supabase
-- error ("column bracket_url does not exist" / PGRST204 / Postgres 42703) even
-- though the application code looks correct. See ADR 0004 and
-- docs/runbooks/incident-bracket-url-save-failure.md for the full writeup.
--
-- Note: this fix was originally diagnosed in an earlier session, but that
-- session was interrupted before the migration was actually committed —
-- src/integrations/supabase/types.ts and this migration file did not exist
-- in the repository despite Phase 10/11 documentation initially assuming
-- they did. Applied for real in Phase 11 after the documentation audit
-- caught the discrepancy.

alter table public.events
  add column if not exists bracket_url text;

comment on column public.events.bracket_url is
  'Optional link to the tournament bracket, set by the organiser from the Gaming event''s Tournament page (EventTournament.tsx).';
