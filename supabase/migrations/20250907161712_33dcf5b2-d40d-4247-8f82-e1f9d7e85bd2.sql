-- CRITICAL FIX: Remove the policy that's still exposing customer data
-- The "Public can view reviewer display names" policy actually exposes ALL profile fields
-- for users who have written reviews, including email and phone numbers

DROP POLICY IF EXISTS "Public can view reviewer display names" ON public.profiles;

-- Do not create any public access policy - profiles should only be accessible to:
-- 1. The user themselves
-- 2. Field owners (for their customers)  
-- 3. Admins
-- 4. System functions

-- Reviews will need to handle display names differently in the application layer