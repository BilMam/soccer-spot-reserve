-- Migration: Update approve_owner_application with enhanced validation and CinetPay integration
-- This RPC now includes phone verification checks and calls create-owner-contact

CREATE OR REPLACE FUNCTION public.approve_owner_application(
  application_id uuid, 
  notes text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  app_record RECORD;
  profile_record RECORD;
  existing_owner RECORD;
  contact_result json;
  result json;
BEGIN
  -- Verify admin permissions
  IF NOT (
    has_role(auth.uid(), 'super_admin') 
    OR has_role(auth.uid(), 'admin_general') 
    OR has_role(auth.uid(), 'admin_fields')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Get application details
  SELECT * INTO app_record 
  FROM public.owner_applications 
  WHERE id = application_id AND status = 'pending';

  IF app_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application not found or already processed'
    );
  END IF;

  -- Validation 1: Check if phone_verified_at is not null
  IF app_record.phone_verified_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Phone number must be verified before approval'
    );
  END IF;

  -- Validation 2: Check for duplicate phone in owners table
  SELECT * INTO existing_owner 
  FROM public.owners 
  WHERE phone = app_record.phone 
    AND status IN ('pending', 'approved')
    AND id != application_id;

  IF existing_owner IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Phone number already registered by another owner'
    );
  END IF;

  -- Get profile information for CinetPay contact
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE id = app_record.user_id;

  IF profile_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;

  -- Update the application status
  UPDATE public.owner_applications 
  SET 
    status = 'approved',
    admin_notes = COALESCE(notes, admin_notes),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = application_id;

  -- Insert or update in owners table
  INSERT INTO public.owners (
    user_id,
    phone,
    mobile_money,
    status,
    created_at,
    updated_at
  ) VALUES (
    app_record.user_id,
    app_record.phone,
    app_record.phone_payout,
    'approved',
    now(),
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    phone = EXCLUDED.phone,
    mobile_money = EXCLUDED.mobile_money,
    status = 'approved',
    updated_at = now();

  -- Add owner role in user_roles
  INSERT INTO public.user_roles (user_id, role, granted_by, notes)
  VALUES (
    app_record.user_id, 
    'owner', 
    auth.uid(), 
    COALESCE(notes, 'Approved owner application')
  )
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    granted_by = auth.uid(), 
    granted_at = now(), 
    is_active = true,
    notes = COALESCE(notes, 'Approved owner application');

  -- Prepare result
  result := json_build_object(
    'success', true,
    'message', 'Owner application approved successfully',
    'owner_id', app_record.user_id,
    'phone', app_record.phone,
    'should_create_contact', true,
    'contact_data', json_build_object(
      'owner_id', app_record.user_id,
      'owner_name', COALESCE(profile_record.full_name, app_record.full_name, 'Owner'),
      'owner_surname', '',
      'phone', app_record.phone,
      'email', COALESCE(profile_record.email, 'owner-' || app_record.user_id || '@mysport.ci'),
      'country_prefix', '225'
    )
  );

  RETURN result;

EXCEPTION 
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Phone number already registered'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Approval failed: ' || SQLERRM
    );
END;
$function$;

-- Create helper function to reject applications
CREATE OR REPLACE FUNCTION public.reject_owner_application(
  application_id uuid, 
  notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  app_record RECORD;
BEGIN
  -- Verify admin permissions
  IF NOT (
    has_role(auth.uid(), 'super_admin') 
    OR has_role(auth.uid(), 'admin_general') 
    OR has_role(auth.uid(), 'admin_fields')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Get application details
  SELECT * INTO app_record 
  FROM public.owner_applications 
  WHERE id = application_id AND status = 'pending';

  IF app_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application not found or already processed'
    );
  END IF;

  -- Update the application status
  UPDATE public.owner_applications 
  SET 
    status = 'rejected',
    admin_notes = notes,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = application_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Owner application rejected',
    'application_id', application_id
  );

EXCEPTION 
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Rejection failed: ' || SQLERRM
    );
END;
$function$;

-- Add comments for documentation
COMMENT ON FUNCTION public.approve_owner_application(uuid, text) IS 'Approves owner application with validation and returns data for CinetPay contact creation';
COMMENT ON FUNCTION public.reject_owner_application(uuid, text) IS 'Rejects owner application with admin notes';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Updated approve_owner_application RPC with enhanced validation and CinetPay integration';
END $$;