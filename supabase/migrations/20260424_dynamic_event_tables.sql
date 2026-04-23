-- Migration: Automatically create a new table for an event when it is approved (is_active = true)
-- NOTE: This is generally considered a database anti-pattern compared to a single event_registrations table.
-- However, this fulfills the requirement to create separate tables automatically.

CREATE OR REPLACE FUNCTION public.create_event_table_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  table_name TEXT;
BEGIN
  -- We only want to trigger this if is_active becomes true.
  -- This handles both INSERT (if created as active) and UPDATE (if changed from inactive to active)
  IF NEW.is_active = true AND (TG_OP = 'INSERT' OR OLD.is_active IS FALSE OR OLD.is_active IS NULL) THEN
    
    -- 1. Create specific schema for Online Hackathons
    IF NEW.type::text ILIKE '%Hackathon%' AND NEW.format::text ILIKE '%Online%' THEN

      -- Generate table name based on slug
      IF NEW.slug IS NOT NULL THEN
        table_name := 'event_reg_' || replace(lower(NEW.slug), '-', '_');
      ELSE
        table_name := 'event_reg_' || replace(NEW.id::text, '-', '_');
      END IF;
      table_name := quote_ident(table_name);

      -- Execute dynamic SQL to create the table
      EXECUTE 'CREATE TABLE IF NOT EXISTS public.' || table_name || ' (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        team_id UUID REFERENCES public.event_teams(id) ON DELETE SET NULL,
        name TEXT,
        email TEXT,
        phone TEXT,
        school TEXT,
        year TEXT,
        stream TEXT,
        participation_mode TEXT,
        expected_members INTEGER,
        motivation TEXT,
        github TEXT,
        linkedin TEXT,
        role TEXT,
        message TEXT,
        status TEXT DEFAULT ''registered'',
        edit_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, user_id)
      )';
      
      EXECUTE 'ALTER TABLE public.' || table_name || ' ENABLE ROW LEVEL SECURITY';
      
    -- 2. Create specific schema for Offline and Hybrid Hackathons (includes check-in system)
    ELSIF NEW.type::text ILIKE '%Hackathon%' AND (NEW.format::text ILIKE '%Offline%' OR NEW.format::text ILIKE '%Hybrid%') THEN

      -- Generate table name based on slug
      IF NEW.slug IS NOT NULL THEN
        table_name := 'event_reg_' || replace(lower(NEW.slug), '-', '_');
      ELSE
        table_name := 'event_reg_' || replace(NEW.id::text, '-', '_');
      END IF;
      table_name := quote_ident(table_name);

      -- Execute dynamic SQL to create the table WITH check-in columns
      EXECUTE 'CREATE TABLE IF NOT EXISTS public.' || table_name || ' (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        team_id UUID REFERENCES public.event_teams(id) ON DELETE SET NULL,
        name TEXT,
        email TEXT,
        phone TEXT,
        school TEXT,
        year TEXT,
        stream TEXT,
        participation_mode TEXT,
        expected_members INTEGER,
        motivation TEXT,
        github TEXT,
        linkedin TEXT,
        role TEXT,
        message TEXT,
        status TEXT DEFAULT ''registered'',
        edit_count INTEGER DEFAULT 0,
        registration_id TEXT,
        qr_code_data TEXT,
        check_in_status TEXT DEFAULT ''pending'',
        checked_in_at TIMESTAMPTZ,
        checked_in_by TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, user_id)
      )';
      
      EXECUTE 'ALTER TABLE public.' || table_name || ' ENABLE ROW LEVEL SECURITY';
      
    -- 3. Create specific schema for Workshops
    ELSIF NEW.type::text ILIKE '%Workshop%' THEN

      -- Generate table name based on slug
      IF NEW.slug IS NOT NULL THEN
        table_name := 'event_reg_' || replace(lower(NEW.slug), '-', '_');
      ELSE
        table_name := 'event_reg_' || replace(NEW.id::text, '-', '_');
      END IF;
      table_name := quote_ident(table_name);

      -- Execute dynamic SQL to create the table WITH workshop columns
      EXECUTE 'CREATE TABLE IF NOT EXISTS public.' || table_name || ' (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        name TEXT,
        email TEXT,
        phone TEXT,
        school TEXT,
        class TEXT,
        branch TEXT,
        stream TEXT,
        motivation TEXT,
        status TEXT DEFAULT ''registered'',
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, user_id)
      )';
      
      EXECUTE 'ALTER TABLE public.' || table_name || ' ENABLE ROW LEVEL SECURITY';
      
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for when an event is updated (approved)
DROP TRIGGER IF EXISTS trigger_create_event_table_update ON public.events;
CREATE TRIGGER trigger_create_event_table_update
AFTER UPDATE OF is_active ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.create_event_table_on_approval();

-- Trigger for when an event is inserted (already approved)
DROP TRIGGER IF EXISTS trigger_create_event_table_insert ON public.events;
CREATE TRIGGER trigger_create_event_table_insert
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.create_event_table_on_approval();
