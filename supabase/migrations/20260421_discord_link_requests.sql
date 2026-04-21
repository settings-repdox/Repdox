-- Table to store temporary linking tokens for Discord
CREATE TABLE IF NOT EXISTS public.discord_link_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    token text NOT NULL UNIQUE,
    discord_id text NOT NULL,
    discord_username text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + interval '10 minutes'),
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for discord_link_requests
ALTER TABLE public.discord_link_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read of requests by token (to verify existence)
CREATE POLICY "Allow public read by token" ON public.discord_link_requests
    FOR SELECT USING (true);

-- Bot will manage insertion (using service role typically, or we can add a specific policy if needed)
