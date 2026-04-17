-- Add missing columns for team registration support
ALTER TABLE public.event_teams ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 4;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.event_teams(id) ON DELETE SET NULL;
