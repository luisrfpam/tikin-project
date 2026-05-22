-- Make identifier lookup work for pending signups too (before profile/user_roles bootstrap).
CREATE OR REPLACE FUNCTION public.lookup_email_by_identifier(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH doc AS (
    SELECT regexp_replace(coalesce(_identifier, ''), '\\D', '', 'g') AS digits
  ),
  matches AS (
    SELECT lower(p.email) AS email, 1 AS priority
    FROM public.profiles p
    CROSS JOIN doc d
    WHERE d.digits <> ''
      AND (
        regexp_replace(coalesce(p.cpf, ''), '\\D', '', 'g') = d.digits
        OR regexp_replace(coalesce(p.cnpj, ''), '\\D', '', 'g') = d.digits
      )

    UNION ALL

    SELECT lower(p.email) AS email, 1 AS priority
    FROM public.issuers i
    JOIN public.profiles p ON p.id = i.user_id
    CROSS JOIN doc d
    WHERE d.digits <> ''
      AND regexp_replace(coalesce(i.cnpj, ''), '\\D', '', 'g') = d.digits

    UNION ALL

    SELECT lower(p.email) AS email, 1 AS priority
    FROM public.establishments e
    JOIN public.profiles p ON p.id = e.user_id
    CROSS JOIN doc d
    WHERE d.digits <> ''
      AND regexp_replace(coalesce(e.cnpj, ''), '\\D', '', 'g') = d.digits

    UNION ALL

    SELECT lower(u.email) AS email,
           CASE WHEN u.email_confirmed_at IS NULL THEN 3 ELSE 2 END AS priority
    FROM auth.users u
    CROSS JOIN doc d
    WHERE d.digits <> ''
      AND (
        regexp_replace(coalesce(u.raw_user_meta_data ->> 'cpf', ''), '\\D', '', 'g') = d.digits
        OR regexp_replace(coalesce(u.raw_user_meta_data ->> 'cnpj', ''), '\\D', '', 'g') = d.digits
      )
      AND u.email IS NOT NULL
  )
  SELECT m.email
  FROM matches m
  ORDER BY m.priority, m.email
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_email_by_identifier(text) TO anon, authenticated;
