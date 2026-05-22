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
  v_trade_name text;
  v_razao_social text;
  v_responsible_name text;
  v_responsible_role text;
  v_corporate_email text;
  v_category text;
  v_cep text;
  v_logradouro text;
  v_numero text;
  v_complemento text;
  v_bairro text;
  v_cidade text;
  v_uf text;
  v_address text;
  v_contact_email text;
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

  IF v_role IS NOT NULL THEN
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

  IF v_role = 'lojista' AND v_cnpj IS NOT NULL THEN
    v_trade_name := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'trade_name', '')), '');
    v_company_name := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), '');
    v_category := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'category', '')), '');
    v_cep := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'cep', '')), '');
    v_logradouro := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'logradouro', '')), '');
    v_numero := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'numero', '')), '');
    v_complemento := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'complemento', '')), '');
    v_bairro := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'bairro', '')), '');
    v_cidade := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'cidade', '')), '');
    v_uf := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'uf', '')), '');
    v_address := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'address', '')), '');
    v_contact_email := nullif(trim(COALESCE(NEW.raw_user_meta_data->>'contact_email', NEW.email)), '');

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
      cnae_validated
    )
    VALUES (
      NEW.id,
      COALESCE(v_company_name, v_name),
      COALESCE(v_trade_name, v_name),
      v_cnpj,
      v_category,
      v_cep,
      v_logradouro,
      v_numero,
      v_complemento,
      v_bairro,
      v_cidade,
      v_uf,
      v_address,
      v_contact_email,
      '5611201',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
