
CREATE OR REPLACE FUNCTION public.get_issuer_beneficiaries(_issuer_id uuid)
RETURNS TABLE(id uuid, name text, cpf_masked text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         p.name,
         CASE
           WHEN p.cpf IS NULL OR length(regexp_replace(p.cpf,'\D','','g')) <> 11 THEN '—'
           ELSE substr(regexp_replace(p.cpf,'\D','','g'),1,3) || '.***.***-' || substr(regexp_replace(p.cpf,'\D','','g'),10,2)
         END AS cpf_masked,
         ib.status
  FROM public.issuer_beneficiaries ib
  JOIN public.profiles p ON p.id = ib.beneficiary_id
  WHERE ib.issuer_id = _issuer_id
    AND public.is_issuer_owner(_issuer_id, auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_issuer_beneficiaries(uuid) TO authenticated;
