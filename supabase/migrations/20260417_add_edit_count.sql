-- Track how many times a registration has been edited
ALTER TABLE public.event_registrations 
ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;
