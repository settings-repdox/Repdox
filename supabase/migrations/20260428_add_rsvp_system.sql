-- Migration: Add RSVP System to Events
-- Enables event creators to set RSVP windows with opt-in/opt-out basis
-- Tracks RSVP responses and automated email notifications

-- 1. Create RSVP type enumeration
CREATE TYPE rsvp_type AS ENUM ('opt-in', 'opt-out');

-- 2. Add RSVP columns to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS rsvp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rsvp_type rsvp_type DEFAULT 'opt-in',
ADD COLUMN IF NOT EXISTS rsvp_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rsvp_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rsvp_reminder_sent_at TIMESTAMPTZ;

-- 3. Create event_rsvp_responses table to track user RSVP responses
CREATE TABLE IF NOT EXISTS public.event_rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('attending', 'not_attending', 'maybe')),
  notes TEXT,
  responded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, email)
);

-- 4. Create event_rsvp_email_logs table to track sent emails
CREATE TABLE IF NOT EXISTS public.event_rsvp_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_rsvp_responses_event_id ON public.event_rsvp_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_responses_email ON public.event_rsvp_responses(email);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_responses_user_id ON public.event_rsvp_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_email_logs_event_id ON public.event_rsvp_email_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_email_logs_email ON public.event_rsvp_email_logs(email);
CREATE INDEX IF NOT EXISTS idx_events_rsvp_enabled ON public.events(rsvp_enabled, rsvp_end_date);

-- 6. Enable RLS on new tables
ALTER TABLE public.event_rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvp_email_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for event_rsvp_responses
-- Admins can view/modify all RSVP responses
DROP POLICY IF EXISTS "Admins can manage rsvp responses" ON public.event_rsvp_responses;
CREATE POLICY "Admins can manage rsvp responses" ON public.event_rsvp_responses
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' IN ('shlokram5mar@gmail.com', 'amishgandhi316@gmail.com'));

-- Public can view aggregate RSVP data for events they created
DROP POLICY IF EXISTS "Organizers view event rsvp responses" ON public.event_rsvp_responses;
CREATE POLICY "Organizers view event rsvp responses" ON public.event_rsvp_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_rsvp_responses.event_id 
      AND created_by = auth.uid()
    )
  );

-- Users can view their own RSVP response
DROP POLICY IF EXISTS "Users view own rsvp response" ON public.event_rsvp_responses;
CREATE POLICY "Users view own rsvp response" ON public.event_rsvp_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- Users can insert/update their own RSVP response
DROP POLICY IF EXISTS "Users can submit rsvp" ON public.event_rsvp_responses;
CREATE POLICY "Users can submit rsvp" ON public.event_rsvp_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR email = auth.jwt() ->> 'email'
  );

DROP POLICY IF EXISTS "Users can update own rsvp" ON public.event_rsvp_responses;
CREATE POLICY "Users can update own rsvp" ON public.event_rsvp_responses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR email = auth.jwt() ->> 'email')
  WITH CHECK (user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- 8. RLS Policies for event_rsvp_email_logs
-- Admins can view all logs
DROP POLICY IF EXISTS "Admins can view email logs" ON public.event_rsvp_email_logs;
CREATE POLICY "Admins can view email logs" ON public.event_rsvp_email_logs
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' IN ('shlokram5mar@gmail.com', 'amishgandhi316@gmail.com'));

-- Organizers can view logs for their events
DROP POLICY IF EXISTS "Organizers view email logs" ON public.event_rsvp_email_logs;
CREATE POLICY "Organizers view email logs" ON public.event_rsvp_email_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_rsvp_email_logs.event_id 
      AND created_by = auth.uid()
    )
  );

-- 9. Create function to get RSVP summary for an event
CREATE OR REPLACE FUNCTION public.get_rsvp_summary(p_event_id UUID)
RETURNS TABLE(
  total_responses BIGINT,
  attending BIGINT,
  not_attending BIGINT,
  maybe BIGINT,
  response_rate NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_registrations BIGINT;
  v_total_responses BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_registrations 
  FROM public.event_registrations 
  WHERE event_id = p_event_id;

  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN response = 'attending' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN response = 'not_attending' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN response = 'maybe' THEN 1 ELSE 0 END), 0),
    CASE WHEN v_total_registrations > 0 
      THEN (COUNT(*)::NUMERIC / v_total_registrations::NUMERIC * 100) 
      ELSE 0 
    END
  INTO total_responses, attending, not_attending, maybe, response_rate
  FROM public.event_rsvp_responses
  WHERE event_id = p_event_id;

  RETURN QUERY SELECT total_responses, attending, not_attending, maybe, response_rate;
END;
$$;

COMMENT ON FUNCTION public.get_rsvp_summary(UUID) IS 'Get RSVP summary statistics for an event';

-- 10. Create audit trigger to track RSVP response updates
CREATE OR REPLACE FUNCTION public.update_rsvp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_rsvp_updated_at
BEFORE UPDATE ON public.event_rsvp_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_rsvp_updated_at();

COMMENT ON MIGRATION 20260428_add_rsvp_system IS 'Add RSVP system with opt-in/opt-out support and email tracking';
