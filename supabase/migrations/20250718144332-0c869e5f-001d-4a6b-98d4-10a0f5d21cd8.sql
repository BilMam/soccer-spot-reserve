-- Create owners table
CREATE TABLE public.owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_payout_account_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_accounts table
CREATE TABLE public.payout_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  phone TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('orange', 'mtn', 'moov')),
  cinetpay_contact_id TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_owner_phone UNIQUE (owner_id, phone)
);

-- Add foreign key constraint to owners table for default_payout_account_id
ALTER TABLE public.owners 
ADD CONSTRAINT fk_owners_default_payout_account 
FOREIGN KEY (default_payout_account_id) 
REFERENCES public.payout_accounts(id) ON DELETE SET NULL;

-- Add payout_account_id to fields table
ALTER TABLE public.fields 
ADD COLUMN payout_account_id UUID NULL REFERENCES public.payout_accounts(id) ON DELETE SET NULL;

-- Modify owner_applications table to add phone verification fields
ALTER TABLE public.owner_applications 
ADD COLUMN phone_payout TEXT NULL,
ADD COLUMN phone_verified_at TIMESTAMP WITH TIME ZONE NULL;

-- Enable RLS on new tables
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for owners table
CREATE POLICY "Users can view their own owner record"
ON public.owners FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own owner record"
ON public.owners FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for payout_accounts table
CREATE POLICY "Owners can view their own payout accounts"
ON public.payout_accounts FOR SELECT
USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

CREATE POLICY "Owners can create their own payout accounts"
ON public.payout_accounts FOR INSERT
WITH CHECK (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update their own payout accounts"
ON public.payout_accounts FOR UPDATE
USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

CREATE POLICY "System can manage payout accounts"
ON public.payout_accounts FOR ALL
USING (true);

-- Function to detect operator from phone number
CREATE OR REPLACE FUNCTION public.detect_operator(phone_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Remove spaces and special characters
  phone_number := regexp_replace(phone_number, '[^\d]', '', 'g');
  
  -- Check for Ivory Coast prefixes
  IF phone_number ~ '^(225)?07' THEN
    RETURN 'orange';
  ELSIF phone_number ~ '^(225)?05' THEN
    RETURN 'mtn';
  ELSIF phone_number ~ '^(225)?01' THEN
    RETURN 'moov';
  ELSE
    RETURN 'orange'; -- Default fallback
  END IF;
END;
$$;