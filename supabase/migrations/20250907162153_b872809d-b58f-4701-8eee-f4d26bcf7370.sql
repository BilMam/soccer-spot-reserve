-- Create trigger function to automatically set reviewer_name when a review is created
CREATE OR REPLACE FUNCTION public.set_reviewer_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get the user's display name from their profile
  SELECT full_name INTO NEW.reviewer_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Set default if no name found
  IF NEW.reviewer_name IS NULL OR NEW.reviewer_name = '' THEN
    NEW.reviewer_name := 'Utilisateur anonyme';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set reviewer name on review creation
DROP TRIGGER IF EXISTS set_reviewer_name_trigger ON public.reviews;
CREATE TRIGGER set_reviewer_name_trigger
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reviewer_name();