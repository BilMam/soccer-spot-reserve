
-- Créer la table pour les demandes de propriétaires
CREATE TABLE public.owner_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  experience TEXT,
  motivation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Activer RLS sur la table owner_applications
ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs voient leurs propres demandes
CREATE POLICY "Users can view their own applications" 
ON public.owner_applications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs créent leurs propres demandes
CREATE POLICY "Users can create their own applications" 
ON public.owner_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Politique pour que les utilisateurs modifient leurs propres demandes (si pending)
CREATE POLICY "Users can update their own pending applications" 
ON public.owner_applications 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

-- Politique pour que les admins voient toutes les demandes
CREATE POLICY "Admins can view all applications" 
ON public.owner_applications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Politique pour que les admins modifient toutes les demandes
CREATE POLICY "Admins can update all applications" 
ON public.owner_applications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Fonction pour obtenir les demandes de propriétaires (pour les admins)
CREATE OR REPLACE FUNCTION public.get_all_owner_applications()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  full_name TEXT,
  phone TEXT,
  experience TEXT,
  motivation TEXT,
  status TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    oa.id,
    oa.user_id,
    oa.full_name,
    oa.phone,
    oa.experience,
    oa.motivation,
    oa.status,
    oa.admin_notes,
    oa.reviewed_by,
    oa.reviewed_at,
    oa.created_at,
    oa.updated_at,
    p.email as user_email
  FROM public.owner_applications oa
  LEFT JOIN public.profiles p ON oa.user_id = p.id
  ORDER BY oa.created_at DESC;
END;
$$;

-- Fonction pour obtenir une demande de propriétaire par user_id
CREATE OR REPLACE FUNCTION public.get_user_owner_application(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  full_name TEXT,
  phone TEXT,
  experience TEXT,
  motivation TEXT,
  status TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur demande ses propres données ou qu'il est admin
  IF auth.uid() != p_user_id AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    oa.id,
    oa.user_id,
    oa.full_name,
    oa.phone,
    oa.experience,
    oa.motivation,
    oa.status,
    oa.admin_notes,
    oa.reviewed_by,
    oa.reviewed_at,
    oa.created_at,
    oa.updated_at
  FROM public.owner_applications oa
  WHERE oa.user_id = p_user_id;
END;
$$;

-- Fonction pour approuver une demande de propriétaire
CREATE OR REPLACE FUNCTION public.approve_owner_application(application_id UUID, notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Mettre à jour la demande
  UPDATE public.owner_applications 
  SET 
    status = 'approved',
    admin_notes = COALESCE(notes, admin_notes),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = application_id;

  -- Mettre à jour le type d'utilisateur dans profiles
  UPDATE public.profiles 
  SET user_type = 'owner'
  WHERE id = (SELECT user_id FROM public.owner_applications WHERE id = application_id);
END;
$$;

-- Fonction pour rejeter une demande de propriétaire
CREATE OR REPLACE FUNCTION public.reject_owner_application(application_id UUID, notes TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Mettre à jour la demande
  UPDATE public.owner_applications 
  SET 
    status = 'rejected',
    admin_notes = notes,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = application_id;
END;
$$;

-- Fonction pour approuver un terrain
CREATE OR REPLACE FUNCTION public.approve_field(field_id UUID, notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Pour l'instant, on ne fait que marquer le terrain comme actif
  -- On pourrait ajouter une colonne 'approved_by' et 'approved_at' plus tard
  UPDATE public.fields 
  SET 
    is_active = true,
    updated_at = now()
  WHERE id = field_id;
END;
$$;
