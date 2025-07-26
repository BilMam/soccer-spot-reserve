-- Supprimer les comptes de paiement en double
-- Garder seulement le premier compte avec cinetpay_contact_id configuré
DO $$
DECLARE
    first_account_id uuid;
    owner_user_id uuid;
BEGIN
    -- Récupérer l'ID utilisateur courant depuis les emails conservés
    SELECT id INTO owner_user_id 
    FROM auth.users 
    WHERE email IN ('dia.mamadoubilo@gmail.com', 'travaildumams516@gmail.com')
    LIMIT 1;
    
    IF owner_user_id IS NOT NULL THEN
        -- Trouver le premier compte avec cinetpay_contact_id configuré pour cet utilisateur
        SELECT pa.id INTO first_account_id
        FROM public.payout_accounts pa
        JOIN public.owners o ON pa.owner_id = o.id
        WHERE o.user_id = owner_user_id 
        AND pa.cinetpay_contact_id IS NOT NULL
        ORDER BY pa.created_at ASC
        LIMIT 1;
        
        IF first_account_id IS NOT NULL THEN
            -- Supprimer tous les autres comptes pour cet utilisateur
            DELETE FROM public.payout_accounts 
            WHERE id IN (
                SELECT pa.id 
                FROM public.payout_accounts pa
                JOIN public.owners o ON pa.owner_id = o.id
                WHERE o.user_id = owner_user_id 
                AND pa.id != first_account_id
            );
            
            -- S'assurer que le compte restant est par défaut et actif
            UPDATE public.payout_accounts 
            SET is_active = true
            WHERE id = first_account_id;
            
            -- Définir ce compte comme défaut pour le propriétaire
            UPDATE public.owners 
            SET default_payout_account_id = first_account_id
            WHERE user_id = owner_user_id;
            
            RAISE NOTICE 'Comptes de paiement nettoyés. Compte conservé: %', first_account_id;
        END IF;
    END IF;
END $$;