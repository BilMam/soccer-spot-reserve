-- Migration: Fix user_role_type enum to be idempotent for Preview deployment
-- This ensures migrations can run multiple times without breaking existing functions/policies

-- Rendre l'enum idempotent sans DROP/CREATE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE public.user_role_type AS ENUM (
      'super_admin',
      'admin_general',
      'admin_fields',
      'admin_users',
      'moderator',
      'owner',
      'player'
    );
  END IF;
END $$;

-- Ajouter des valeurs sans casser si elles existent déjà
DO $$
BEGIN
  -- Check and add 'super_admin' if not exists
  PERFORM 1 FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role_type' AND e.enumlabel = 'super_admin';
  IF NOT FOUND THEN
    ALTER TYPE user_role_type ADD VALUE 'super_admin';
  END IF;

  -- Check and add 'admin' if not exists
  PERFORM 1 FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role_type' AND e.enumlabel = 'admin';
  IF NOT FOUND THEN
    ALTER TYPE user_role_type ADD VALUE 'admin';
  END IF;

  -- Check and add 'owner' if not exists
  PERFORM 1 FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role_type' AND e.enumlabel = 'owner';
  IF NOT FOUND THEN
    ALTER TYPE user_role_type ADD VALUE 'owner';
  END IF;

  -- Check and add 'player' if not exists
  PERFORM 1 FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role_type' AND e.enumlabel = 'player';
  IF NOT FOUND THEN
    ALTER TYPE user_role_type ADD VALUE 'player';
  END IF;

  -- Check and add 'admin_general' if not exists
  PERFORM 1 FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role_type' AND e.enumlabel = 'admin_general';
  IF NOT FOUND THEN
    ALTER TYPE user_role_type ADD VALUE 'admin_general';
  END IF;

  -- Check and add 'admin_fields' if not exists
  PERFORM 1 FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role_type' AND e.enumlabel = 'admin_fields';
  IF NOT FOUND THEN
    ALTER TYPE user_role_type ADD VALUE 'admin_fields';
  END IF;

  -- Check and add 'admin_users' if not exists
  PERFORM 1 FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role_type' AND e.enumlabel = 'admin_users';
  IF NOT FOUND THEN
    ALTER TYPE user_role_type ADD VALUE 'admin_users';
  END IF;

  -- Check and add 'moderator' if not exists
  PERFORM 1 FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role_type' AND e.enumlabel = 'moderator';
  IF NOT FOUND THEN
    ALTER TYPE user_role_type ADD VALUE 'moderator';
  END IF;
END $$;