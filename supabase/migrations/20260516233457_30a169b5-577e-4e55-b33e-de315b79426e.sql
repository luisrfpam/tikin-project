CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET search_path = public, extensions;

UPDATE auth.users
SET encrypted_password = crypt('Bruno@2026', gen_salt('bf')),
    updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111105';