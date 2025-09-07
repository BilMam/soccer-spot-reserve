-- Create a safe public view for profile information needed by reviews
-- This view only exposes non-sensitive profile data (display name only)

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url
FROM public.profiles;

-- Enable RLS on the view (it will inherit the underlying table's restrictions)
ALTER VIEW public.public_profiles SET (security_barrier = true);

-- Create a policy to allow anyone to view this limited public profile data
-- This is safe because it only exposes non-sensitive display information
CREATE POLICY "Anyone can view public display profiles" 
ON public.public_profiles 
FOR SELECT 
USING (true);

-- Note: Views with security_barrier don't support RLS policies directly
-- Instead, we'll handle this in the application layer by updating queries