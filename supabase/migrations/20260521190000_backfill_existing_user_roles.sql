-- Backfill existing users that were confirmed but still lack an active role.
-- Beneficiaries are identified by CPF on profiles.
-- Merchants are identified by CNPJ on profiles and/or existing establishments.

UPDATE public.profiles p
SET
  email = COALESCE(u.email, p.email),
  name = COALESCE(NULLIF(p.name, ''), NULLIF(u.raw_user_meta_data->>'name', ''), split_part(COALESCE(u.email, p.email), '@', 1)),
  cpf = COALESCE(
    p.cpf,
    NULLIF(regexp_replace(COALESCE(u.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), '')
  ),
  cnpj = COALESCE(
    p.cnpj,
    NULLIF(regexp_replace(COALESCE(u.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g'), '')
  ),
  updated_at = now()
FROM auth.users u
WHERE u.id = p.id;

INSERT INTO public.establishments (
  user_id,
  name,
  trade_name,
  cnpj,
  category,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  uf,
  address,
  contact_email,
  cnae,
  cnae_validated,
  status
)
SELECT
  p.id,
  COALESCE(NULLIF(p.name, ''), split_part(p.email, '@', 1)),
  COALESCE(NULLIF(p.name, ''), split_part(p.email, '@', 1)),
  p.cnpj,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  p.email,
  '5611201',
  true,
  'active'
FROM public.profiles p
WHERE p.cnpj IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.establishments e
    WHERE e.user_id = p.id
  );

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'beneficiario'::public.app_role
FROM public.profiles p
WHERE p.cpf IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.establishments e
    WHERE e.user_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.issuers i
    WHERE i.user_id = p.id
  )
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'lojista'::public.app_role
FROM public.profiles p
WHERE p.cnpj IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'lojista'
  )
  AND (
    EXISTS (
      SELECT 1
      FROM public.establishments e
      WHERE e.user_id = p.id
    )
    OR COALESCE(NULLIF(p.cnpj, ''), '') <> ''
  )
ON CONFLICT (user_id, role) DO NOTHING;
