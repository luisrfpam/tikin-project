-- Admin seguro via Supabase Auth (sem senha hardcoded em RPC)

CREATE TABLE IF NOT EXISTS public.tikin_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tikin_admins_email_check CHECK (position('@' in email) > 1)
);

CREATE OR REPLACE FUNCTION public.update_tikin_admins_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tikin_admins_updated_at ON public.tikin_admins;
CREATE TRIGGER trg_tikin_admins_updated_at
BEFORE UPDATE ON public.tikin_admins
FOR EACH ROW
EXECUTE FUNCTION public.update_tikin_admins_updated_at();

INSERT INTO public.tikin_admins (email, active)
VALUES ('tikinappbr@gmail.com', true)
ON CONFLICT (email) DO UPDATE
SET active = EXCLUDED.active,
    updated_at = now();

ALTER TABLE public.tikin_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read own admin row" ON public.tikin_admins;
CREATE POLICY "Admins read own admin row"
ON public.tikin_admins
FOR SELECT
TO authenticated
USING (lower(email) = lower((auth.jwt() ->> 'email')) AND active = true);

CREATE OR REPLACE FUNCTION public.is_tikin_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.tikin_admins a
    WHERE lower(a.email) = lower(v_email)
      AND a.active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_issuers_secure()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  company_name text,
  razao_social text,
  cnpj text,
  responsible_name text,
  responsible_role text,
  corporate_email text,
  is_enabled boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_tikin_admin() THEN
    RAISE EXCEPTION 'Acesso administrativo não autorizado';
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.user_id,
    i.company_name,
    i.razao_social,
    i.cnpj,
    i.responsible_name,
    i.responsible_role,
    i.corporate_email,
    i.is_enabled,
    i.created_at,
    i.updated_at
  FROM public.issuers i
  ORDER BY i.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_issuer_enabled_secure(
  _issuer_id uuid,
  _is_enabled boolean
)
RETURNS public.issuers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.issuers%ROWTYPE;
BEGIN
  IF NOT public.is_tikin_admin() THEN
    RAISE EXCEPTION 'Acesso administrativo não autorizado';
  END IF;

  UPDATE public.issuers
  SET
    is_enabled = _is_enabled,
    updated_at = now()
  WHERE id = _issuer_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Emitente não encontrado';
  END IF;

  IF _is_enabled THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_row.user_id, 'emissor'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_issuer_secure(
  _issuer_id uuid,
  _company_name text DEFAULT NULL,
  _razao_social text DEFAULT NULL,
  _cnpj text DEFAULT NULL,
  _responsible_name text DEFAULT NULL,
  _responsible_role text DEFAULT NULL,
  _corporate_email text DEFAULT NULL
)
RETURNS public.issuers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.issuers%ROWTYPE;
BEGIN
  IF NOT public.is_tikin_admin() THEN
    RAISE EXCEPTION 'Acesso administrativo não autorizado';
  END IF;

  UPDATE public.issuers
  SET
    company_name = COALESCE(NULLIF(trim(_company_name), ''), company_name),
    razao_social = COALESCE(NULLIF(trim(_razao_social), ''), razao_social),
    cnpj = COALESCE(NULLIF(regexp_replace(COALESCE(_cnpj, ''), '\\D', '', 'g'), ''), cnpj),
    responsible_name = COALESCE(NULLIF(trim(_responsible_name), ''), responsible_name),
    responsible_role = COALESCE(NULLIF(trim(_responsible_role), ''), responsible_role),
    corporate_email = COALESCE(NULLIF(trim(_corporate_email), ''), corporate_email),
    updated_at = now()
  WHERE id = _issuer_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Emitente não encontrado';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_tikin_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_issuers_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_issuer_enabled_secure(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_issuer_secure(uuid, text, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_tikin_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_issuers_secure() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_issuer_enabled_secure(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_issuer_secure(uuid, text, text, text, text, text, text) FROM anon;
