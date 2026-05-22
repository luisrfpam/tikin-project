-- Ensure activation via email click can recover users even when profile row was not created.

CREATE OR REPLACE FUNCTION public.activate_pending_signup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_meta jsonb;
  v_role text;
  v_name text;
  v_cpf text;
  v_cnpj text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT u.email, u.email_confirmed_at, u.raw_user_meta_data
  INTO v_email, v_email_confirmed_at, v_meta
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Email ainda não confirmado';
  END IF;

  v_role := lower(trim(COALESCE(v_meta->>'role', '')));
  IF v_role NOT IN ('beneficiario', 'lojista') THEN
    RETURN jsonb_build_object('activated', false, 'reason', 'role_not_supported');
  END IF;

  v_name := COALESCE(NULLIF(v_meta->>'name', ''), split_part(v_email, '@', 1));
  v_cpf := nullif(regexp_replace(COALESCE(v_meta->>'cpf', ''), '\D', '', 'g'), '');
  v_cnpj := nullif(regexp_replace(COALESCE(v_meta->>'cnpj', ''), '\D', '', 'g'), '');

  INSERT INTO public.profiles (id, email, name, cpf, cnpj)
  VALUES (v_uid, v_email, v_name, v_cpf, v_cnpj)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    cnpj = COALESCE(EXCLUDED.cnpj, public.profiles.cnpj),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'lojista' THEN
    IF v_cnpj IS NULL THEN
      RAISE EXCEPTION 'CNPJ não informado para ativação de lojista';
    END IF;

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
    VALUES (
      v_uid,
      COALESCE(NULLIF(v_meta->>'company_name', ''), v_name),
      COALESCE(NULLIF(v_meta->>'trade_name', ''), v_name),
      v_cnpj,
      NULLIF(v_meta->>'category', ''),
      NULLIF(v_meta->>'cep', ''),
      NULLIF(v_meta->>'logradouro', ''),
      NULLIF(v_meta->>'numero', ''),
      NULLIF(v_meta->>'complemento', ''),
      NULLIF(v_meta->>'bairro', ''),
      NULLIF(v_meta->>'cidade', ''),
      NULLIF(v_meta->>'uf', ''),
      NULLIF(v_meta->>'address', ''),
      COALESCE(NULLIF(v_meta->>'contact_email', ''), v_email),
      '5611201',
      true,
      'active'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      trade_name = EXCLUDED.trade_name,
      cnpj = EXCLUDED.cnpj,
      category = COALESCE(EXCLUDED.category, public.establishments.category),
      cep = COALESCE(EXCLUDED.cep, public.establishments.cep),
      logradouro = COALESCE(EXCLUDED.logradouro, public.establishments.logradouro),
      numero = COALESCE(EXCLUDED.numero, public.establishments.numero),
      complemento = COALESCE(EXCLUDED.complemento, public.establishments.complemento),
      bairro = COALESCE(EXCLUDED.bairro, public.establishments.bairro),
      cidade = COALESCE(EXCLUDED.cidade, public.establishments.cidade),
      uf = COALESCE(EXCLUDED.uf, public.establishments.uf),
      address = COALESCE(EXCLUDED.address, public.establishments.address),
      contact_email = COALESCE(EXCLUDED.contact_email, public.establishments.contact_email),
      cnae_validated = true,
      status = 'active',
      updated_at = now();
  END IF;

  RETURN jsonb_build_object('activated', true, 'role', v_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_pending_signup() TO authenticated;
REVOKE ALL ON FUNCTION public.activate_pending_signup() FROM anon;
