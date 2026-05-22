-- Disable automatic activation for beneficiario/lojista at sign up.
-- Activation will happen only when the user clicks email link and lands on /ativar-cadastro.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_role_text text;
  v_role app_role;
  v_cpf text;
  v_cnpj text;
  v_company_name text;
  v_razao_social text;
  v_responsible_name text;
  v_responsible_role text;
  v_corporate_email text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_role_text := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', '')));

  IF v_role_text IN ('emissor', 'beneficiario', 'lojista') THEN
    v_role := v_role_text::app_role;
  END IF;

  v_cpf := nullif(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), '');
  v_cnpj := nullif(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g'), '');

  INSERT INTO public.profiles (id, email, name, cpf, cnpj)
  VALUES (NEW.id, NEW.email, v_name, v_cpf, v_cnpj)
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    cnpj = COALESCE(EXCLUDED.cnpj, public.profiles.cnpj),
    updated_at = now();

  -- Keep issuer activation behavior unchanged.
  IF v_role = 'emissor' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF v_role = 'emissor' AND v_cnpj IS NOT NULL THEN
    v_company_name := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), '');
    v_razao_social := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'razao_social', '')), '');
    v_responsible_name := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'responsible_name', '')), '');
    v_responsible_role := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'responsible_role', '')), '');
    v_corporate_email := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'corporate_email', NEW.email)), '');

    INSERT INTO public.issuers (
      user_id,
      company_name,
      cnpj,
      razao_social,
      responsible_name,
      responsible_role,
      corporate_email,
      fund_balance
    )
    VALUES (
      NEW.id,
      COALESCE(v_company_name, v_razao_social, v_name),
      v_cnpj,
      v_razao_social,
      v_responsible_name,
      v_responsible_role,
      v_corporate_email,
      100000
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

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

  UPDATE public.profiles
  SET
    name = COALESCE(v_name, name),
    cpf = COALESCE(v_cpf, cpf),
    cnpj = COALESCE(v_cnpj, cnpj),
    email = COALESCE(v_email, email),
    updated_at = now()
  WHERE id = v_uid;

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
