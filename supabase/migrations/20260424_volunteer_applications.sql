-- Migration: Create volunteer_applications table
CREATE TABLE IF NOT EXISTS public.volunteer_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    motivation TEXT,
    role_preference TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own volunteer applications" 
ON public.volunteer_applications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own volunteer applications" 
ON public.volunteer_applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all volunteer applications" 
ON public.volunteer_applications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND handle = 'admin' -- or whatever admin check you use
  )
);
