-- Allow frontend to call Supabase password reset only for activated users.
CREATE OR REPLACE FUNCTION public.can_request_password_recovery(_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(_email, '')));
  v_user_id uuid;
  v_has_active_role boolean := false;
  v_is_issuer_role boolean := false;
  v_is_issuer_enabled boolean := false;
BEGIN
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RETURN false;
  END IF;

  SELECT p.id
  INTO v_user_id
  FROM public.profiles p
  WHERE lower(p.email) = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role IN ('beneficiario'::public.app_role, 'lojista'::public.app_role)
  )
  INTO v_has_active_role;

  IF v_has_active_role THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role = 'emissor'::public.app_role
  )
  INTO v_is_issuer_role;

  IF NOT v_is_issuer_role THEN
    RETURN false;
  END IF;

  SELECT COALESCE(i.is_enabled, false)
  INTO v_is_issuer_enabled
  FROM public.issuers i
  WHERE i.user_id = v_user_id
  LIMIT 1;

  RETURN COALESCE(v_is_issuer_enabled, false);
END;
$$;

REVOKE ALL ON FUNCTION public.can_request_password_recovery(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_request_password_recovery(text) TO anon, authenticated;
