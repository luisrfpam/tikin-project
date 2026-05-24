-- Enforce amount consistency across cycle links:
-- charge.amount must match linked transaction.amount
-- offramp_orders.amount_brl must match linked transaction.amount

CREATE OR REPLACE FUNCTION public.enforce_charge_transaction_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx_amount numeric;
  v_tx_establishment_id uuid;
BEGIN
  IF NEW.transaction_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.amount, t.establishment_id
    INTO v_tx_amount, v_tx_establishment_id
  FROM public.transactions t
  WHERE t.id = NEW.transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação vinculada na cobrança não encontrada';
  END IF;

  IF NEW.establishment_id <> v_tx_establishment_id THEN
    RAISE EXCEPTION 'Cobrança e transação vinculada pertencem a lojistas diferentes';
  END IF;

  IF ROUND(NEW.amount::numeric, 2) <> ROUND(v_tx_amount::numeric, 2) THEN
    RAISE EXCEPTION 'Valor da cobrança difere da transação vinculada (charge=%, tx=%)', NEW.amount, v_tx_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_charge_transaction_consistency ON public.charges;
CREATE TRIGGER trg_enforce_charge_transaction_consistency
BEFORE INSERT OR UPDATE OF transaction_id, amount, establishment_id ON public.charges
FOR EACH ROW
EXECUTE FUNCTION public.enforce_charge_transaction_consistency();

CREATE OR REPLACE FUNCTION public.enforce_offramp_transaction_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx_amount numeric;
  v_tx_establishment_id uuid;
BEGIN
  IF NEW.transaction_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.amount, t.establishment_id
    INTO v_tx_amount, v_tx_establishment_id
  FROM public.transactions t
  WHERE t.id = NEW.transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação vinculada no off-ramp não encontrada';
  END IF;

  IF NEW.establishment_id <> v_tx_establishment_id THEN
    RAISE EXCEPTION 'Off-ramp e transação vinculada pertencem a lojistas diferentes';
  END IF;

  IF ROUND(NEW.amount_brl::numeric, 2) <> ROUND(v_tx_amount::numeric, 2) THEN
    RAISE EXCEPTION 'Valor do off-ramp difere da transação vinculada (offramp=%, tx=%)', NEW.amount_brl, v_tx_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_offramp_transaction_consistency ON public.offramp_orders;
CREATE TRIGGER trg_enforce_offramp_transaction_consistency
BEFORE INSERT OR UPDATE OF transaction_id, amount_brl, establishment_id ON public.offramp_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_offramp_transaction_consistency();

-- Remediation for historical inconsistencies: detach mismatched charge links
-- and mark them as reversed_charge when they had been marked paid.
WITH mismatched_charges AS (
  SELECT c.id
  FROM public.charges c
  JOIN public.transactions t ON t.id = c.transaction_id
  WHERE ROUND(c.amount::numeric, 2) <> ROUND(t.amount::numeric, 2)
)
UPDATE public.charges c
SET
  status = CASE WHEN c.status = 'paid' THEN 'reversed_charge' ELSE c.status END,
  paid_at = CASE WHEN c.status = 'paid' THEN NULL ELSE c.paid_at END,
  transaction_id = NULL,
  description = COALESCE(c.description, '') ||
    CASE
      WHEN COALESCE(c.description, '') ILIKE '%AUTO-RECONCILE amount-mismatch%' THEN ''
      ELSE ' [AUTO-RECONCILE amount-mismatch]'
    END,
  updated_at = now()
WHERE c.id IN (SELECT id FROM mismatched_charges);

-- Remediation for historical off-ramp mismatches: mark as failed and preserve trace in error.
WITH mismatched_offramps AS (
  SELECT o.id, t.amount AS tx_amount
  FROM public.offramp_orders o
  JOIN public.transactions t ON t.id = o.transaction_id
  WHERE ROUND(o.amount_brl::numeric, 2) <> ROUND(t.amount::numeric, 2)
)
UPDATE public.offramp_orders o
SET
  status = 'failed',
  error = COALESCE(o.error, '') ||
    CASE
      WHEN COALESCE(o.error, '') ILIKE '%AUTO-RECONCILE amount-mismatch%' THEN ''
      ELSE format(' [AUTO-RECONCILE amount-mismatch offramp=%s tx=%s]', o.amount_brl, m.tx_amount)
    END,
  updated_at = now()
FROM mismatched_offramps m
WHERE o.id = m.id;
