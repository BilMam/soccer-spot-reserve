-- Fix payment_anomalies RLS security vulnerability
-- Remove the overly permissive policy that allows public access
DROP POLICY IF EXISTS "System can manage payment anomalies" ON public.payment_anomalies;

-- Create secure policies that restrict access to admins only
-- Allow system (service_role) to insert anomaly records during webhook processing
CREATE POLICY "System can insert payment anomalies" 
ON public.payment_anomalies 
FOR INSERT 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Only allow super admins and general admins to view payment anomalies
CREATE POLICY "Admins can view payment anomalies" 
ON public.payment_anomalies 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::user_role_type) OR 
  has_role(auth.uid(), 'admin_general'::user_role_type)
);

-- Allow admins to update anomalies (e.g., mark as resolved)
CREATE POLICY "Admins can update payment anomalies" 
ON public.payment_anomalies 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'super_admin'::user_role_type) OR 
  has_role(auth.uid(), 'admin_general'::user_role_type)
);