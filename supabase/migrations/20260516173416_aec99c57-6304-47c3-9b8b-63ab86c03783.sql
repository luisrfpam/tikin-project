
CREATE TABLE public.voucher_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voucher_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read categories"
ON public.voucher_categories FOR SELECT TO authenticated USING (active = true OR active = false);

CREATE POLICY "Emissores manage categories insert"
ON public.voucher_categories FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'emissor'::app_role));

CREATE POLICY "Emissores manage categories update"
ON public.voucher_categories FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'emissor'::app_role));

CREATE TRIGGER trg_voucher_categories_updated
BEFORE UPDATE ON public.voucher_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.voucher_categories (id, label, icon, sort_order) VALUES
  ('alimentacao','Alimentação','utensils',1),
  ('refeicao','Refeição','coffee',2),
  ('mobilidade','Mobilidade','bus',3),
  ('saude','Saúde','heart',4),
  ('educacao','Educação','book',5),
  ('cultura','Cultura','film',6);

-- Replace consume_issuer_funds to validate category against the table
CREATE OR REPLACE FUNCTION public.consume_issuer_funds(_issuer_id uuid, _value numeric, _category text DEFAULT NULL::text)
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
  cat_exists boolean;
BEGIN
  IF _category IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.voucher_categories WHERE id = _category AND active = true) INTO cat_exists;
    IF NOT cat_exists THEN
      RAISE EXCEPTION 'Categoria inválida: %', _category;
    END IF;
  END IF;

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
