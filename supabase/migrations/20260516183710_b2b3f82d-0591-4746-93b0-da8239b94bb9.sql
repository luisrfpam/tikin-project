
CREATE OR REPLACE FUNCTION public.unaccent_simple(_t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(_t,
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn');
$$;

CREATE OR REPLACE FUNCTION public.normalize_category(_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(public.unaccent_simple(coalesce(_raw,'')))
    WHEN 'alimentacao'  THEN 'alimentacao'
    WHEN 'refeicao'     THEN 'refeicao'
    WHEN 'mobilidade'   THEN 'mobilidade'
    WHEN 'transporte'   THEN 'mobilidade'
    WHEN 'combustivel'  THEN 'mobilidade'
    WHEN 'saude'        THEN 'saude'
    WHEN 'farmacia'     THEN 'saude'
    WHEN 'educacao'     THEN 'educacao'
    WHEN 'cultura'      THEN 'cultura'
    ELSE lower(public.unaccent_simple(coalesce(_raw,'')))
  END
$$;

UPDATE public.transactions
SET voucher_category = public.normalize_category(voucher_category)
WHERE voucher_category IS NOT NULL
  AND voucher_category <> public.normalize_category(voucher_category);

UPDATE public.vouchers
SET rules = jsonb_set(rules, '{category}', to_jsonb(public.normalize_category(rules->>'category')))
WHERE rules ? 'category'
  AND (rules->>'category') <> public.normalize_category(rules->>'category');

UPDATE public.establishments
SET category = public.normalize_category(category)
WHERE category IS NOT NULL
  AND category <> public.normalize_category(category);

UPDATE public.establishments
SET accepted_categories = ARRAY(
  SELECT DISTINCT public.normalize_category(c)
  FROM unnest(accepted_categories) c
)
WHERE accepted_categories IS NOT NULL;
