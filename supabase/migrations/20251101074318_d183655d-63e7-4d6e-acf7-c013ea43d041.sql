-- Activer l'extension pgcrypto nécessaire pour gen_random_bytes()
-- Cette extension permet d'utiliser les fonctions cryptographiques comme gen_random_bytes()
-- utilisées par generate_proof_token() et generate_proof_code()
CREATE EXTENSION IF NOT EXISTS pgcrypto;