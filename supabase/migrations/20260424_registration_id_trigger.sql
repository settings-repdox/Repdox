-- Migration: Add registration_id generation trigger to central table
-- This ensures every registration in the main table gets a unique ID

-- 1. Create the generator function (if not already exists from other migrations)
CREATE OR REPLACE FUNCTION public.generate_registration_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.registration_id IS NULL THEN
        NEW.registration_id := 'REG-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply to central event_registrations table
DROP TRIGGER IF EXISTS tr_generate_registration_id_central ON public.event_registrations;
CREATE TRIGGER tr_generate_registration_id_central
BEFORE INSERT ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.generate_registration_id();
