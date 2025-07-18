-- Migration: Simplifier gestion des comptes de paiement (supprimer operator)

-- 1. Supprimer la colonne operator de payout_accounts
ALTER TABLE public.payout_accounts DROP COLUMN IF EXISTS operator;

-- 2. Supprimer la fonction detect_operator qui n'est plus nécessaire
DROP FUNCTION IF EXISTS public.detect_operator(text);