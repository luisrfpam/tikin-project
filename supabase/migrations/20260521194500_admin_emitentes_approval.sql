-- Aprovação manual de emitentes + RPCs administrativas temporárias

ALTER TABLE public.issuers
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT false;

-- Mantém emitentes já existentes habilitados para evitar regressão.
UPDATE public.issuers
SET is_enabled = true
WHERE is_enabled IS DISTINCT FROM true;

CREATE OR REPLACE FUNCTION public.is_current_issuer_enabled()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_enabled boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT i.is_enabled
  INTO v_enabled
  FROM public.issuers i
  WHERE i.user_id = v_uid
  LIMIT 1;

  RETURN COALESCE(v_enabled, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_tikin_admin_credentials(_admin_email text, _admin_password text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(coalesce(_admin_email, ''))) = 'tikinappbr@gmail.com'
    AND coalesce(_admin_password, '') = 'TkN!9vQ2#Lm7$Rz4@Hp6';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_issuers(_admin_email text, _admin_password text)
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
  IF NOT public.is_tikin_admin_credentials(_admin_email, _admin_password) THEN
    RAISE EXCEPTION 'Credenciais de administrador inválidas';
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

CREATE OR REPLACE FUNCTION public.admin_set_issuer_enabled(
  _admin_email text,
  _admin_password text,
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
  IF NOT public.is_tikin_admin_credentials(_admin_email, _admin_password) THEN
    RAISE EXCEPTION 'Credenciais de administrador inválidas';
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

CREATE OR REPLACE FUNCTION public.admin_update_issuer(
  _admin_email text,
  _admin_password text,
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
  IF NOT public.is_tikin_admin_credentials(_admin_email, _admin_password) THEN
    RAISE EXCEPTION 'Credenciais de administrador inválidas';
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

GRANT EXECUTE ON FUNCTION public.is_current_issuer_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tikin_admin_credentials(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_issuers(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_issuer_enabled(text, text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_issuer(text, text, uuid, text, text, text, text, text, text) TO anon, authenticated;
