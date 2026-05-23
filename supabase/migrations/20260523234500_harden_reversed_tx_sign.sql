-- Defensive hardening: reversed transactions must not keep credit sign.
-- In this schema, valid tx_type values are 'credit' and 'refund'.
-- This protects dashboards even if some query forgets to filter by status.

UPDATE public.transactions
SET
  tx_type = 'refund',
  description = COALESCE(description, '') ||
    CASE
      WHEN COALESCE(description, '') ILIKE '%AUTO-HARDEN reversed-sign%' THEN ''
      ELSE ' [AUTO-HARDEN reversed-sign]'
    END
WHERE status = 'reversed'
  AND tx_type = 'credit';
