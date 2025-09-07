-- Fix security vulnerability: Remove public access to sensitive profile data
-- and implement proper access controls

-- Remove the dangerous "Anyone can view public profile info" policy
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;

-- Create a restricted policy that only allows viewing of non-sensitive public info (like full_name for reviews)
CREATE POLICY "Anyone can view public display name only" 
ON public.profiles 
FOR SELECT 
USING (true);

-- However, we need to restrict what columns can be accessed. 
-- Since PostgreSQL RLS doesn't support column-level restrictions directly,
-- we'll need to handle this differently.

-- Let's remove the public policy entirely and ensure admin access
DROP POLICY IF EXISTS "Anyone can view public display name only" ON public.profiles;

-- Add admin policies for administrative functions
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin_general') OR 
  has_role(auth.uid(), 'admin_users')
);

-- Add a policy for system functions (edge functions) to access profiles when needed
CREATE POLICY "System can access profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Fix the payout_accounts and payouts tables security issues as well
-- Remove public access to payout_accounts
ALTER TABLE public.payout_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

-- Remove the problematic "System can manage payout accounts" policy and replace with proper policies
DROP POLICY IF EXISTS "System can manage payout accounts" ON public.payout_accounts;

-- Add proper system access for payout accounts
CREATE POLICY "System functions can manage payout accounts" 
ON public.payout_accounts 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Fix payouts table - remove public access
ALTER TABLE public.payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Remove and recreate payouts policies
DROP POLICY IF EXISTS "System can manage payouts" ON public.payouts;

CREATE POLICY "Owners can view their own payouts" 
ON public.payouts 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "System functions can manage payouts" 
ON public.payouts 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view all payouts" 
ON public.payouts 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin_general')
);