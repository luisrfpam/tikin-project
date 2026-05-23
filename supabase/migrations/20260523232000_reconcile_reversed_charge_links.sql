-- Reconcile paid charges that still point to reversed transactions.
-- This keeps merchant reporting consistent after transaction reversals.

WITH target AS (
  SELECT c.id
  FROM public.charges c
  JOIN public.transactions t ON t.id = c.transaction_id
  WHERE c.status = 'paid'
    AND t.status = 'reversed'
), upd AS (
  UPDATE public.charges c
  SET
    status = 'reversed_charge',
    transaction_id = NULL,
    paid_at = NULL,
    updated_at = now(),
    description = trim(coalesce(c.description, '')) ||
      CASE
        WHEN coalesce(c.description, '') ILIKE '%AUTO-RECONCILE reversed tx%' THEN ''
        ELSE ' [AUTO-RECONCILE reversed tx]'
      END
  WHERE c.id IN (SELECT id FROM target)
  RETURNING c.id
)
SELECT count(*) AS reconciled_charges
FROM upd;
