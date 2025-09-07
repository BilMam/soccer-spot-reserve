-- Fix security vulnerability: Remove public access to sensitive profile data
-- and implement proper access controls

-- Remove the dangerous "Anyone can view public profile info" policy
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;

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

-- Fix the payout_accounts table security issues  
-- Remove the problematic "System can manage payout accounts" policy and replace with proper policies
DROP POLICY IF EXISTS "System can manage payout accounts" ON public.payout_accounts;

-- Add proper system access for payout accounts
CREATE POLICY "System functions can manage payout accounts" 
ON public.payout_accounts 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Fix payouts table - remove the problematic "System can manage payouts" policy
DROP POLICY IF EXISTS "System can manage payouts" ON public.payouts;

-- Add system and admin access for payouts (don't recreate existing owner policy)
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