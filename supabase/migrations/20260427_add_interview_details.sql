-- Add interview columns to volunteer_applications
ALTER TABLE public.volunteer_applications 
ADD COLUMN IF NOT EXISTS interview_time TEXT,
ADD COLUMN IF NOT EXISTS meet_link TEXT;
