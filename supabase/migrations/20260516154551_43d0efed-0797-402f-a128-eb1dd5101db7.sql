ALTER TABLE public.issuer_funds
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS category_caps jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_rollover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_allocated jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.consume_issuer_funds(_issuer_id uuid, _value numeric, _category text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m date := date_trunc('month', now())::date;
  rec public.issuer_funds%ROWTYPE;
  cap numeric;
  cat_alloc numeric;
BEGIN
  SELECT * INTO rec FROM public.issuer_funds WHERE issuer_id = _issuer_id AND month = m FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento do mês não configurado';
  END IF;
  IF rec.allocated + _value > rec.monthly_budget THEN
    RAISE EXCEPTION 'Saldo de fundos insuficiente para o mês';
  END IF;

  IF _category IS NOT NULL AND rec.category_caps ? _category THEN
    cap := (rec.category_caps ->> _category)::numeric;
    cat_alloc := COALESCE((rec.category_allocated ->> _category)::numeric, 0);
    IF cat_alloc + _value > cap THEN
      RAISE EXCEPTION 'Limite da categoria % atingido', _category;
    END IF;
  END IF;

  UPDATE public.issuer_funds
  SET allocated = allocated + _value,
      category_allocated = CASE
        WHEN _category IS NULL THEN category_allocated
        ELSE jsonb_set(
          category_allocated,
          ARRAY[_category],
          to_jsonb(COALESCE((category_allocated ->> _category)::numeric, 0) + _value)
        )
      END
  WHERE id = rec.id;
END;
$function$;