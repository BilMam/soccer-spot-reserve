-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own owner record" ON public.owners;

-- Create a new INSERT policy that allows both user authentication and service role access
CREATE POLICY "Users can insert their own owner record" 
ON public.owners 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'role')::text = 'service_role'
);