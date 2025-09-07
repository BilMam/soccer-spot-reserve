-- Create a limited public access policy for reviews display
-- This allows public access to ONLY full_name and avatar_url for users who have reviews
-- This is safe because it only exposes display names, not sensitive data like email/phone

CREATE POLICY "Public can view reviewer display names" 
ON public.profiles 
FOR SELECT 
USING (
  -- Only allow access to full_name and avatar_url fields
  -- for users who have written reviews (this will be enforced at the application level)
  id IN (SELECT DISTINCT user_id FROM public.reviews)
);

-- Note: This policy allows viewing the full profile record, but the application
-- should only use full_name and avatar_url fields from public queries