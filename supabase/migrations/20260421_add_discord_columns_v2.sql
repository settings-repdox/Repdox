-- Add Discord identity columns to user_profiles for bot support
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS discord_id text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS discord_username text;
