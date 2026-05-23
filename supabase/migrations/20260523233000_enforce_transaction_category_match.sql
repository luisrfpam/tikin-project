-- Enforce category compatibility at DB level for any confirmed credit transaction,
-- independent of which app path writes the record.

CREATE OR REPLACE FUNCTION public.enforce_transaction_category_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_est public.establishments%ROWTYPE;
  v_voucher_category text;
  v_fallback_category text;
  v_allowed text[];
BEGIN
  -- Only enforce for effective beneficiary spending rows.
  IF NEW.tx_type IS DISTINCT FROM 'credit' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_est
  FROM public.establishments
  WHERE id = NEW.establishment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado para transação %', NEW.id;
  END IF;

  SELECT public.normalize_category(v.rules->>'category')
  INTO v_voucher_category
  FROM public.vouchers v
  WHERE v.id = NEW.voucher_id;

  IF v_voucher_category IS NULL OR v_voucher_category = '' THEN
    RAISE EXCEPTION 'Voucher sem categoria válida para transação %', NEW.id;
  END IF;

  v_fallback_category := public.normalize_category(v_est.category);

  v_allowed := ARRAY(
    SELECT DISTINCT public.normalize_category(c)
    FROM unnest(COALESCE(v_est.accepted_categories, '{}'::text[])) c
    WHERE c IS NOT NULL
      AND btrim(c) <> ''
  );

  IF COALESCE(array_length(v_allowed, 1), 0) = 0
     AND COALESCE(v_fallback_category, '') <> '' THEN
    v_allowed := ARRAY[v_fallback_category];
  END IF;

  -- No category configured means unrestricted merchant legacy mode.
  IF COALESCE(array_length(v_allowed, 1), 0) > 0 THEN
    IF NOT (v_voucher_category = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Categoria % não aceita por este lojista', v_voucher_category;
    END IF;
  END IF;

  -- Persist normalized category on transaction row.
  NEW.voucher_category := v_voucher_category;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_transaction_category_match ON public.transactions;

CREATE TRIGGER trg_enforce_transaction_category_match
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_transaction_category_match();
