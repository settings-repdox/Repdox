-- Add Discord integration columns to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS discord_id text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS discord_username text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS discord_link_code text;
