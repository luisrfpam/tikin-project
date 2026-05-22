-- When admin enables an issuer, also confirm issuer auth email to allow immediate login.

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
    RAISE EXCEPTION 'Acesso administrativo nao autorizado';
  END IF;

  UPDATE public.issuers
  SET
    is_enabled = _is_enabled,
    updated_at = now()
  WHERE id = _issuer_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Emitente nao encontrado';
  END IF;

  IF _is_enabled THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_row.user_id, 'emissor'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Confirm the issuer account in Supabase Auth on approval.
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmed_at = COALESCE(confirmed_at, now())
    WHERE id = v_row.user_id;
  END IF;

  RETURN v_row;
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
    RAISE EXCEPTION 'Credenciais de administrador invalidas';
  END IF;

  UPDATE public.issuers
  SET
    is_enabled = _is_enabled,
    updated_at = now()
  WHERE id = _issuer_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Emitente nao encontrado';
  END IF;

  IF _is_enabled THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_row.user_id, 'emissor'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Keep legacy path consistent with secure admin path.
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmed_at = COALESCE(confirmed_at, now())
    WHERE id = v_row.user_id;
  END IF;

  RETURN v_row;
END;
$$;
