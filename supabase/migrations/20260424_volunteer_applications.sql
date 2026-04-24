-- Create volunteer_applications table
CREATE TABLE IF NOT EXISTS public.volunteer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    school TEXT,
    city TEXT,
    branch TEXT,
    class TEXT,
    role_preference TEXT,
    motivation TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'interview', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own volunteer applications" ON public.volunteer_applications;
CREATE POLICY "Users can view their own volunteer applications" 
ON public.volunteer_applications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own volunteer applications" ON public.volunteer_applications;
CREATE POLICY "Users can insert their own volunteer applications" 
ON public.volunteer_applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all volunteer applications" ON public.volunteer_applications;
CREATE POLICY "Admins can view all volunteer applications" 
ON public.volunteer_applications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() 
    AND (
        email = 'shlokram5mar@gmail.com' OR 
        email = 'amishgandhi316@gmail.com'
    )
  )
);
