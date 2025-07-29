-- Nettoyer tous les utilisateurs sauf les deux comptes spécifiés
-- Garder: dia.mamadoubilo@gmail.com et travaildumams516@gmail.com

DO $$
DECLARE
    user_ids_to_keep uuid[];
BEGIN
    -- Récupérer les IDs des utilisateurs à garder
    SELECT array_agg(id) INTO user_ids_to_keep
    FROM profiles 
    WHERE email IN ('dia.mamadoubilo@gmail.com', 'travaildumams516@gmail.com');
    
    -- Supprimer les données des tables liées pour tous les autres utilisateurs
    
    -- Supprimer les rôles utilisateur
    DELETE FROM public.user_roles 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les favoris
    DELETE FROM public.user_favorites 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les badges utilisateur
    DELETE FROM public.user_badges 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les préférences de notification
    DELETE FROM public.user_notification_preferences 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les notifications SMS
    DELETE FROM public.sms_notifications 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les rappels d'avis
    DELETE FROM public.review_reminders 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les avis
    DELETE FROM public.reviews 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les réservations
    DELETE FROM public.bookings 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les demandes de propriétaire
    DELETE FROM public.owner_applications 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les propriétaires
    DELETE FROM public.owners 
    WHERE NOT (user_id = ANY(user_ids_to_keep));
    
    -- Supprimer les terrains des propriétaires supprimés
    DELETE FROM public.fields 
    WHERE NOT (owner_id = ANY(user_ids_to_keep));
    
    -- Supprimer les profils
    DELETE FROM public.profiles 
    WHERE NOT (id = ANY(user_ids_to_keep));
    
    -- Enfin, supprimer les utilisateurs de auth.users
    DELETE FROM auth.users 
    WHERE NOT (id = ANY(user_ids_to_keep));
    
    RAISE NOTICE 'Nettoyage terminé. Utilisateurs conservés: %', array_length(user_ids_to_keep, 1);
END $$;