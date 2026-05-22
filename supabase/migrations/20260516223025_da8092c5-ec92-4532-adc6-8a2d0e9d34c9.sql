CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET search_path = public, extensions;

UPDATE auth.users
SET encrypted_password = crypt('demo1234', gen_salt('bf')),
    updated_at = now()
WHERE email = 'mercado.bom@demo.tikin.com';
