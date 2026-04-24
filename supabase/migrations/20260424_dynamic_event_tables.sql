-- NOTE: This is generally considered a database anti-pattern compared to a single event_registrations table.
-- However, this fulfills the requirement to create separate tables automatically.

-- 1. Create the generator function for registration IDs
CREATE OR REPLACE FUNCTION public.generate_registration_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.registration_id IS NULL THEN
        NEW.registration_id := 'REG-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
      
      -- Add RLS policies
      -- 1. Admins can do everything
      EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Admins can manage all" ON public.' || table_name || ' FOR ALL TO authenticated USING (
        auth.jwt() ->> ''email'' IN (''shlokram5mar@gmail.com'', ''amishgandhi316@gmail.com'')
      )';
      
      -- 2. Users can view their own registration
      EXECUTE 'DROP POLICY IF EXISTS "Users can view own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can view own" ON public.' || table_name || ' FOR SELECT TO authenticated USING (auth.uid() = user_id)';
      
      -- 3. Users can insert their own registration
      EXECUTE 'DROP POLICY IF EXISTS "Users can insert own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can insert own" ON public.' || table_name || ' FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
      
      -- 4. Users can update their own registration
      EXECUTE 'DROP POLICY IF EXISTS "Users can update own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can update own" ON public.' || table_name || ' FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
      
      -- Reload schema cache so PostgREST sees the new table immediately
      NOTIFY pgrst, 'reload schema';
      
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
      
      -- Add registration ID trigger
      EXECUTE 'CREATE TRIGGER tr_generate_registration_id_' || table_name || '
               BEFORE INSERT ON public.' || table_name || '
               FOR EACH ROW
               EXECUTE FUNCTION public.generate_registration_id()';
      
      EXECUTE 'ALTER TABLE public.' || table_name || ' ENABLE ROW LEVEL SECURITY';

      -- Add RLS policies
      EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Admins can manage all" ON public.' || table_name || ' FOR ALL TO authenticated USING (
        auth.jwt() ->> ''email'' IN (''shlokram5mar@gmail.com'', ''amishgandhi316@gmail.com'')
      )';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can view own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can view own" ON public.' || table_name || ' FOR SELECT TO authenticated USING (auth.uid() = user_id)';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can insert own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can insert own" ON public.' || table_name || ' FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can update own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can update own" ON public.' || table_name || ' FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';

      -- Reload schema cache
      NOTIFY pgrst, 'reload schema';
      
    -- 3. Create specific schema for Online Workshops
    ELSIF NEW.type::text ILIKE '%Workshop%' AND NEW.format::text ILIKE '%Online%' THEN

      -- Generate table name based on slug
      IF NEW.slug IS NOT NULL THEN
        table_name := 'event_reg_' || replace(lower(NEW.slug), '-', '_');
      ELSE
        table_name := 'event_reg_' || replace(NEW.id::text, '-', '_');
      END IF;
      table_name := quote_ident(table_name);

      -- Execute dynamic SQL to create the table WITH online workshop columns
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

      -- Add RLS policies
      EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Admins can manage all" ON public.' || table_name || ' FOR ALL TO authenticated USING (
        auth.jwt() ->> ''email'' IN (''shlokram5mar@gmail.com'', ''amishgandhi316@gmail.com'')
      )';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can view own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can view own" ON public.' || table_name || ' FOR SELECT TO authenticated USING (auth.uid() = user_id)';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can insert own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can insert own" ON public.' || table_name || ' FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can update own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can update own" ON public.' || table_name || ' FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';

      -- Reload schema cache
      NOTIFY pgrst, 'reload schema';
      
    -- 4. Create specific schema for Offline and Hybrid Workshops (includes check-in)
    ELSIF NEW.type::text ILIKE '%Workshop%' AND (NEW.format::text ILIKE '%Offline%' OR NEW.format::text ILIKE '%Hybrid%') THEN

      -- Generate table name based on slug
      IF NEW.slug IS NOT NULL THEN
        table_name := 'event_reg_' || replace(lower(NEW.slug), '-', '_');
      ELSE
        table_name := 'event_reg_' || replace(NEW.id::text, '-', '_');
      END IF;
      table_name := quote_ident(table_name);

      -- Execute dynamic SQL to create the table WITH offline workshop columns
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
        registration_id TEXT,
        qr_code_data TEXT,
        check_in_status TEXT DEFAULT ''pending'',
        checked_in_at TIMESTAMPTZ,
        checked_in_by TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, user_id)
      )';
      
      -- Add registration ID trigger
      EXECUTE 'CREATE TRIGGER tr_generate_registration_id_' || table_name || '
               BEFORE INSERT ON public.' || table_name || '
               FOR EACH ROW
               EXECUTE FUNCTION public.generate_registration_id()';
      
      EXECUTE 'ALTER TABLE public.' || table_name || ' ENABLE ROW LEVEL SECURITY';

      -- Add RLS policies
      EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Admins can manage all" ON public.' || table_name || ' FOR ALL TO authenticated USING (
        auth.jwt() ->> ''email'' IN (''shlokram5mar@gmail.com'', ''amishgandhi316@gmail.com'')
      )';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can view own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can view own" ON public.' || table_name || ' FOR SELECT TO authenticated USING (auth.uid() = user_id)';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can insert own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can insert own" ON public.' || table_name || ' FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can update own" ON public.' || table_name;
      EXECUTE 'CREATE POLICY "Users can update own" ON public.' || table_name || ' FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';

      -- Reload schema cache
      NOTIFY pgrst, 'reload schema';
      
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
