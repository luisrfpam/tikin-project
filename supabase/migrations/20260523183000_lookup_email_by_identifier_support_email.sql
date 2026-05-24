-- Extend identifier lookup to also match email and preserve role-aware behavior.
CREATE OR REPLACE FUNCTION public.lookup_email_by_identifier(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.lookup_email_by_identifier(_identifier, NULL::public.app_role);
$$;

GRANT EXECUTE ON FUNCTION public.lookup_email_by_identifier(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_email_by_identifier(
  _identifier text,
  _expected_role public.app_role DEFAULT NULL
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH raw AS (
    SELECT lower(trim(coalesce(_identifier, ''))) AS identifier
  ),
  doc AS (
    SELECT
      r.identifier,
      regexp_replace(r.identifier, '\\D', '', 'g') AS digits,
      position('@' in r.identifier) > 1 AS is_email
    FROM raw r
  ),
  matches AS (
    SELECT lower(p.email) AS email, 1 AS priority
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    CROSS JOIN doc d
    WHERE (
      d.is_email
      AND lower(p.email) = d.identifier
      AND (_expected_role IS NULL OR ur.role = _expected_role)
    )
    OR (
      d.digits <> ''
      AND (_expected_role IS NULL OR ur.role = _expected_role)
      AND (
        regexp_replace(coalesce(p.cpf, ''), '\\D', '', 'g') = d.digits
        OR regexp_replace(coalesce(p.cnpj, ''), '\\D', '', 'g') = d.digits
      )
    )

    UNION ALL

    SELECT lower(p.email) AS email, 1 AS priority
    FROM public.issuers i
    JOIN public.profiles p ON p.id = i.user_id
    CROSS JOIN doc d
    WHERE (
      d.is_email
      AND (_expected_role IS NULL OR _expected_role = 'emissor')
      AND lower(p.email) = d.identifier
    )
    OR (
      d.digits <> ''
      AND (_expected_role IS NULL OR _expected_role = 'emissor')
      AND regexp_replace(coalesce(i.cnpj, ''), '\\D', '', 'g') = d.digits
    )

    UNION ALL

    SELECT lower(p.email) AS email, 1 AS priority
    FROM public.establishments e
    JOIN public.profiles p ON p.id = e.user_id
    CROSS JOIN doc d
    WHERE (
      d.is_email
      AND (_expected_role IS NULL OR _expected_role = 'lojista')
      AND lower(p.email) = d.identifier
    )
    OR (
      d.digits <> ''
      AND (_expected_role IS NULL OR _expected_role = 'lojista')
      AND regexp_replace(coalesce(e.cnpj, ''), '\\D', '', 'g') = d.digits
    )

    UNION ALL

    SELECT lower(u.email) AS email,
           CASE WHEN u.email_confirmed_at IS NULL THEN 3 ELSE 2 END AS priority
    FROM auth.users u
    CROSS JOIN doc d
    WHERE u.email IS NOT NULL
      AND (
        (d.is_email AND lower(u.email) = d.identifier)
        OR (
          d.digits <> ''
          AND (
            regexp_replace(coalesce(u.raw_user_meta_data ->> 'cpf', ''), '\\D', '', 'g') = d.digits
            OR regexp_replace(coalesce(u.raw_user_meta_data ->> 'cnpj', ''), '\\D', '', 'g') = d.digits
          )
        )
      )
      AND (
        _expected_role IS NULL
        OR lower(coalesce(u.raw_user_meta_data ->> 'role', '')) = _expected_role::text
      )
  )
  SELECT m.email
  FROM matches m
  ORDER BY m.priority, m.email
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_email_by_identifier(text, public.app_role) TO anon, authenticated;
