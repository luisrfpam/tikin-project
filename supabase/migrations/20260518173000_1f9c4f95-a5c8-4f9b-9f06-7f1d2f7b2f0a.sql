-- Robust login lookup by CPF/CNPJ across profile and role-specific tables
CREATE OR REPLACE FUNCTION public.lookup_email_by_identifier(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH doc AS (
    SELECT regexp_replace(coalesce(_identifier, ''), '\D', '', 'g') AS digits
  )
  SELECT m.email
  FROM (
    SELECT p.email
    FROM public.profiles p
    CROSS JOIN doc d
    WHERE d.digits <> ''
      AND (
        regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g') = d.digits
        OR regexp_replace(coalesce(p.cnpj, ''), '\D', '', 'g') = d.digits
      )

    UNION ALL

    SELECT p.email
    FROM public.issuers i
    JOIN public.profiles p ON p.id = i.user_id
    CROSS JOIN doc d
    WHERE d.digits <> ''
      AND regexp_replace(coalesce(i.cnpj, ''), '\D', '', 'g') = d.digits

    UNION ALL

    SELECT p.email
    FROM public.establishments e
    JOIN public.profiles p ON p.id = e.user_id
    CROSS JOIN doc d
    WHERE d.digits <> ''
      AND regexp_replace(coalesce(e.cnpj, ''), '\D', '', 'g') = d.digits
  ) AS m
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_email_by_identifier(text) TO anon, authenticated;
