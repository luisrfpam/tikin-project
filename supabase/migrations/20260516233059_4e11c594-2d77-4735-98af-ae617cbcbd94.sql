
CREATE OR REPLACE FUNCTION public.get_issuer_beneficiary_cpf(_issuer_id uuid, _beneficiary_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.cpf
  FROM public.profiles p
  JOIN public.issuer_beneficiaries ib ON ib.beneficiary_id = p.id
  WHERE ib.issuer_id = _issuer_id
    AND ib.beneficiary_id = _beneficiary_id
    AND public.is_issuer_owner(_issuer_id, auth.uid())
  LIMIT 1;
$$;
