-- Add reviewer_name column to reviews table to avoid needing public profile access
-- This stores the display name at the time of review creation for security

ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Update existing reviews with current user names (one-time migration)
UPDATE public.reviews 
SET reviewer_name = (
  SELECT p.full_name 
  FROM public.profiles p 
  WHERE p.id = reviews.user_id
)
WHERE reviewer_name IS NULL;

-- Set default value for future reviews
ALTER TABLE public.reviews 
ALTER COLUMN reviewer_name SET DEFAULT 'Utilisateur anonyme';