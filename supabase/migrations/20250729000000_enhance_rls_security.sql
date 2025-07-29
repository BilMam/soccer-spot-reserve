-- Migration: Enhance RLS security for owner workflow tables
-- Ensure proper security policies for owner_applications, owners, and payment_accounts

-- Step 1: Add missing admin policies for payment_accounts
DROP POLICY IF EXISTS "Admins can view all payment accounts" ON public.payment_accounts;
DROP POLICY IF EXISTS "Admins can update payment accounts" ON public.payment_accounts;

CREATE POLICY "Admins can view all payment accounts" 
ON public.payment_accounts 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['super_admin','admin_general']::user_role_type[]));

CREATE POLICY "Admins can update payment accounts" 
ON public.payment_accounts 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['super_admin','admin_general']::user_role_type[]));

-- Step 2: Restrict Edge Function insert policy for payment_accounts (more secure)
DROP POLICY IF EXISTS "Allow insert from edge functions" ON public.payment_accounts;

CREATE POLICY "Service role can manage payment accounts"
ON public.payment_accounts 
FOR ALL
USING (auth.role() = 'service_role');

-- Step 3: Ensure owners table has proper RLS policies
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can view their own record" ON public.owners;
DROP POLICY IF EXISTS "Owners can update their own record" ON public.owners;
DROP POLICY IF EXISTS "Admins can view all owners" ON public.owners;
DROP POLICY IF EXISTS "Admins can update all owners" ON public.owners;
DROP POLICY IF EXISTS "Service role can manage owners" ON public.owners;

-- Owners can view their own record
CREATE POLICY "Owners can view their own record" 
ON public.owners 
FOR SELECT 
USING (auth.uid() = user_id);

-- Owners can update their own basic info (not status or admin fields)
CREATE POLICY "Owners can update own basic info" 
ON public.owners 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND OLD.status = NEW.status  -- Cannot change status
  AND OLD.user_id = NEW.user_id -- Cannot change user_id
);

-- Admins can view all owners
CREATE POLICY "Admins can view all owners" 
ON public.owners 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['super_admin','admin_general']::user_role_type[]));

-- Admins can update all owners (including status)
CREATE POLICY "Admins can update all owners" 
ON public.owners 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['super_admin','admin_general']::user_role_type[]));

-- Service role (Edge Functions) can manage owners
CREATE POLICY "Service role can manage owners"
ON public.owners 
FOR ALL
USING (auth.role() = 'service_role');

-- Step 4: Add DELETE policies for cleanup operations
CREATE POLICY "Admins can delete owner applications" 
ON public.owner_applications 
FOR DELETE 
USING (has_any_role(auth.uid(), ARRAY['super_admin','admin_general']::user_role_type[]));

CREATE POLICY "Service role can delete applications"
ON public.owner_applications 
FOR DELETE 
USING (auth.role() = 'service_role');

-- Step 5: Add security function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_user_owner(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.owners 
    WHERE user_id = user_uuid 
    AND status = 'approved'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_user_owner(UUID) TO authenticated;

-- Step 6: Add logging table for security audit
CREATE TABLE IF NOT EXISTS public.owner_workflow_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  admin_id UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

ALTER TABLE public.owner_workflow_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.owner_workflow_audit 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['super_admin','admin_general']::user_role_type[]));

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
ON public.owner_workflow_audit 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Step 7: Create audit trigger function
CREATE OR REPLACE FUNCTION public.owner_workflow_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log operations on owner_applications and owners tables
  IF TG_TABLE_NAME IN ('owner_applications', 'owners', 'payment_accounts') THEN
    INSERT INTO public.owner_workflow_audit (
      table_name,
      operation,
      old_data,
      new_data,
      user_id,
      admin_id,
      performed_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.user_id
        ELSE NEW.user_id
      END,
      auth.uid(),
      NOW()
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Step 8: Add audit triggers
DROP TRIGGER IF EXISTS owner_applications_audit_trigger ON public.owner_applications;
DROP TRIGGER IF EXISTS owners_audit_trigger ON public.owners;
DROP TRIGGER IF EXISTS payment_accounts_audit_trigger ON public.payment_accounts;

CREATE TRIGGER owner_applications_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.owner_applications
  FOR EACH ROW EXECUTE FUNCTION public.owner_workflow_audit_trigger();

CREATE TRIGGER owners_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.owners
  FOR EACH ROW EXECUTE FUNCTION public.owner_workflow_audit_trigger();

CREATE TRIGGER payment_accounts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.owner_workflow_audit_trigger();

-- Step 9: Ensure proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_owners_user_id_status ON public.owners(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_owner_provider ON public.payment_accounts(owner_id, payment_provider);
CREATE INDEX IF NOT EXISTS idx_audit_table_operation ON public.owner_workflow_audit(table_name, operation, performed_at);

-- Step 10: Add comments for documentation
COMMENT ON POLICY "Service role can manage payment accounts" ON public.payment_accounts IS 'Allows Edge Functions to create/update payment accounts during owner approval process';
COMMENT ON POLICY "Service role can manage owners" ON public.owners IS 'Allows Edge Functions (via approve_owner_application RPC) to create owners from applications';
COMMENT ON TABLE public.owner_workflow_audit IS 'Audit log for all owner workflow operations (applications, approvals, payment account creation)';
COMMENT ON FUNCTION public.is_user_owner(UUID) IS 'Security function to check if a user is an approved owner';

-- Verify policies are in place
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies on critical tables
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('owner_applications', 'owners', 'payment_accounts');
  
  RAISE NOTICE 'Total RLS policies on owner workflow tables: %', policy_count;
  
  -- Ensure RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'owner_applications' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on owner_applications table';
  END IF;
  
  RAISE NOTICE 'RLS security enhancement completed successfully';
END $$;