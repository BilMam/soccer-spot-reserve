-- Activer les extensions nécessaires pour le CRON et les requêtes HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Programmer la tâche de nettoyage automatique toutes les 5 minutes
SELECT cron.schedule(
  'cleanup-expired-bookings',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT public.cleanup_expired_bookings();
  $$
);