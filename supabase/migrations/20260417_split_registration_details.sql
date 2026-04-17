-- Split JSON message content into separate filterable columns
ALTER TABLE public.event_registrations 
ADD COLUMN IF NOT EXISTS school text,
ADD COLUMN IF NOT EXISTS year text,
ADD COLUMN IF NOT EXISTS stream text,
ADD COLUMN IF NOT EXISTS motivation text,
ADD COLUMN IF NOT EXISTS github text,
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS participation_mode text,
ADD COLUMN IF NOT EXISTS expected_members integer;
