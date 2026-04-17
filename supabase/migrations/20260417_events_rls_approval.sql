-- Migration: Fix Events RLS for Admin Approval
-- This migration ensures that admins can see pending events and everyone can see active events.

-- 1. Enable RLS on events table (just in case it wasn't enabled via migrations)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies to start fresh
DROP POLICY IF EXISTS "Public can view active events" ON public.events;
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Admins can update all events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete all events" ON public.events;

-- 3. SELECT POLICIES

-- Anyone (including guests) can see events that are approved/active
CREATE POLICY "Public can view active events" ON public.events
  FOR SELECT USING (is_active = true);

-- Users can see their own events regardless of status
CREATE POLICY "Users can view their own events" ON public.events
  FOR SELECT USING (auth.uid() = created_by);

-- Admins can see ALL events (including pending ones)
CREATE POLICY "Admins can view all events" ON public.events
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('shlokram5mar@gmail.com', 'amishgandhi316@gmail.com')
  );

-- 4. INSERT POLICIES

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON public.events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. UPDATE POLICIES

-- Users can update their own events (e.g. fixing a typo while pending)
CREATE POLICY "Users can update their own events" ON public.events
  FOR UPDATE USING (auth.uid() = created_by);

-- Admins can update any event (to approve them)
CREATE POLICY "Admins can update all events" ON public.events
  FOR UPDATE USING (
    auth.jwt() ->> 'email' IN ('shlokram5mar@gmail.com', 'amishgandhi316@gmail.com')
  );

-- 6. DELETE POLICIES

-- Users can delete their own events
CREATE POLICY "Users can delete their own events" ON public.events
  FOR DELETE USING (auth.uid() = created_by);

-- Admins can delete any event
CREATE POLICY "Admins can delete all events" ON public.events
  FOR DELETE USING (
    auth.jwt() ->> 'email' IN ('shlokram5mar@gmail.com', 'amishgandhi316@gmail.com')
  );

-- 7. AUDIT LOG TRIGGER (Optional but recommended)
-- Ensure created_by is always the current user on insert
CREATE OR REPLACE FUNCTION public.set_event_creator()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_event_creator ON public.events;
CREATE TRIGGER trigger_set_event_creator
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_event_creator();
