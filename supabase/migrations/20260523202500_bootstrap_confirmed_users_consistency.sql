-- Keep auth/profiles/role tables consistent for confirmed users.
-- This prevents cases where a confirmed account is missing role/table bootstrap.

CREATE OR REPLACE FUNCTION public.bootstrap_confirmed_auth_user(
  _uid uuid,
  _email text,
  _meta jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_role text;
  v_cpf text;
  v_cnpj text;
  v_company_name text;
  v_trade_name text;
  v_razao_social text;
  v_responsible_name text;
  v_responsible_role text;
  v_corporate_email text;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  v_name := COALESCE(NULLIF(_meta->>'name', ''), split_part(COALESCE(_email, ''), '@', 1), 'usuario');
  v_role := lower(trim(COALESCE(_meta->>'role', '')));
  v_cpf := nullif(regexp_replace(COALESCE(_meta->>'cpf', ''), '\\D', '', 'g'), '');
  v_cnpj := nullif(regexp_replace(COALESCE(_meta->>'cnpj', ''), '\\D', '', 'g'), '');

  INSERT INTO public.profiles (id, email, name, cpf, cnpj)
  VALUES (_uid, _email, v_name, v_cpf, v_cnpj)
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    cnpj = COALESCE(EXCLUDED.cnpj, public.profiles.cnpj),
    updated_at = now();

  IF v_role IN ('beneficiario', 'lojista') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, v_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF v_role = 'lojista' AND v_cnpj IS NOT NULL THEN
    v_company_name := nullif(trim(COALESCE(_meta->>'company_name', '')), '');
    v_trade_name := nullif(trim(COALESCE(_meta->>'trade_name', '')), '');

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
      _uid,
      COALESCE(v_company_name, v_name),
      COALESCE(v_trade_name, v_name),
      v_cnpj,
      NULLIF(_meta->>'category', ''),
      NULLIF(_meta->>'cep', ''),
      NULLIF(_meta->>'logradouro', ''),
      NULLIF(_meta->>'numero', ''),
      NULLIF(_meta->>'complemento', ''),
      NULLIF(_meta->>'bairro', ''),
      NULLIF(_meta->>'cidade', ''),
      NULLIF(_meta->>'uf', ''),
      NULLIF(_meta->>'address', ''),
      COALESCE(NULLIF(_meta->>'contact_email', ''), _email),
      '5611201',
      true,
      'active'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
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

  IF v_role = 'emissor' AND v_cnpj IS NOT NULL THEN
    v_company_name := nullif(trim(COALESCE(_meta->>'company_name', '')), '');
    v_razao_social := nullif(trim(COALESCE(_meta->>'razao_social', '')), '');
    v_responsible_name := nullif(trim(COALESCE(_meta->>'responsible_name', '')), '');
    v_responsible_role := nullif(trim(COALESCE(_meta->>'responsible_role', '')), '');
    v_corporate_email := nullif(trim(COALESCE(_meta->>'corporate_email', _email)), '');

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
      _uid,
      COALESCE(v_company_name, v_razao_social, v_name),
      v_cnpj,
      v_razao_social,
      v_responsible_name,
      v_responsible_role,
      v_corporate_email,
      100000
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      company_name = COALESCE(EXCLUDED.company_name, public.issuers.company_name),
      cnpj = COALESCE(EXCLUDED.cnpj, public.issuers.cnpj),
      razao_social = COALESCE(EXCLUDED.razao_social, public.issuers.razao_social),
      responsible_name = COALESCE(EXCLUDED.responsible_name, public.issuers.responsible_name),
      responsible_role = COALESCE(EXCLUDED.responsible_role, public.issuers.responsible_role),
      corporate_email = COALESCE(EXCLUDED.corporate_email, public.issuers.corporate_email),
      updated_at = now();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.bootstrap_confirmed_auth_user(NEW.id, NEW.email, NEW.raw_user_meta_data);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_confirmed();

DO $$
BEGIN
  PERFORM public.bootstrap_confirmed_auth_user(u.id, u.email, u.raw_user_meta_data)
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL
    AND lower(COALESCE(u.raw_user_meta_data->>'role', '')) IN ('beneficiario', 'lojista', 'emissor')
    AND (
      NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
      OR (
        lower(COALESCE(u.raw_user_meta_data->>'role', '')) IN ('beneficiario', 'lojista')
        AND NOT EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = u.id
            AND ur.role = (lower(COALESCE(u.raw_user_meta_data->>'role', '')))::public.app_role
        )
      )
      OR (
        lower(COALESCE(u.raw_user_meta_data->>'role', '')) = 'lojista'
        AND NOT EXISTS (SELECT 1 FROM public.establishments e WHERE e.user_id = u.id)
      )
      OR (
        lower(COALESCE(u.raw_user_meta_data->>'role', '')) = 'emissor'
        AND NOT EXISTS (SELECT 1 FROM public.issuers i WHERE i.user_id = u.id)
      )
    );
END;
$$;
