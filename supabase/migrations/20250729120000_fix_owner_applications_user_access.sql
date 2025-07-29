-- Migration: Fix RLS security for owner_applications - Add user access policy
-- Allows users to view their own applications (critical for UX)

-- Add missing policy for users to view their own applications
CREATE POLICY "Users can view their own applications" 
ON public.owner_applications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add comprehensive service_role policy for owner_applications
CREATE POLICY "Service role can manage applications"
ON public.owner_applications 
FOR ALL
USING (auth.role() = 'service_role');

-- Add policy for users to update their own applications (if needed for editing)
CREATE POLICY "Users can update their own pending applications" 
ON public.owner_applications 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND status = 'pending'  -- Only pending applications can be updated by users
)
WITH CHECK (
  auth.uid() = user_id 
  AND status IN ('pending', 'under_review')  -- Prevent direct approval by users
  AND OLD.user_id = NEW.user_id  -- Cannot change user_id
);

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own applications" ON public.owner_applications IS 'Allows users to check the status of their owner applications';
COMMENT ON POLICY "Service role can manage applications" ON public.owner_applications IS 'Allows Edge Functions to create, read, update applications during workflow';
COMMENT ON POLICY "Users can update their own pending applications" ON public.owner_applications IS 'Allows users to edit pending applications (before admin review)';

-- Verify the new policies are created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count user access policies on owner_applications
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'owner_applications'
  AND policyname LIKE '%Users can%';
  
  RAISE NOTICE 'User access policies on owner_applications: %', policy_count;
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Failed to create user access policies for owner_applications';
  END IF;
  
  RAISE NOTICE 'RLS user access fix completed successfully';
END $$;