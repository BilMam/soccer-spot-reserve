-- Migration: Ajouter les colonnes de garantie à la table fields
-- Feature: Garantie Terrain Bloqué (paiement en 2 temps)

ALTER TABLE public.fields
  ADD COLUMN IF NOT EXISTS guarantee_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS guarantee_percentage integer DEFAULT 20
    CHECK (guarantee_percentage IN (10, 20, 30, 50)),
  ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'full'
    CHECK (payment_mode IN ('full', 'guarantee', 'both'));
