UPDATE public.issuer_funds f
SET status = 'active',
    last_stellar_tx_hash = COALESCE(f.last_stellar_tx_hash, o.stellar_tx_hash)
FROM public.onramp_orders o
WHERE o.issuer_funds_id = f.id
  AND o.status = 'paid'
  AND f.status = 'pending_funding';