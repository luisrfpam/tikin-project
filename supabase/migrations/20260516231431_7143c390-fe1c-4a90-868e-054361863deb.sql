CREATE OR REPLACE FUNCTION public.lookup_beneficiary_name_by_cpf(_cpf text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name
  FROM public.profiles p
  WHERE regexp_replace(coalesce(p.cpf,''),'\D','','g') = regexp_replace(coalesce(_cpf,''),'\D','','g')
    AND public.has_role(auth.uid(), 'emissor'::app_role)
  LIMIT 1;
$$;