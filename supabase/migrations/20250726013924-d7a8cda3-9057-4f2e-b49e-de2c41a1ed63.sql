-- Créer la nouvelle fonction get_users_with_roles sans user_type
CREATE FUNCTION public.get_users_with_roles()
RETURNS TABLE(user_id uuid, email text, full_name text, roles user_role_type[], created_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    COALESCE(array_agg(ur.role) FILTER (WHERE ur.is_active = true), '{}') as roles,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.is_active = true 
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  WHERE has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
  GROUP BY p.id, p.email, p.full_name, p.created_at
  ORDER BY p.created_at DESC;
$$;