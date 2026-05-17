
CREATE TABLE public.blockchain_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  internal_id uuid NOT NULL,
  entity_type text NOT NULL,
  operation text NOT NULL,
  amount numeric,
  stellar_tx_hash text,
  stellar_ledger bigint,
  status text NOT NULL DEFAULT 'pending',
  error text,
  issuer_id uuid,
  actor_id uuid,
  memo_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_bctx_internal ON public.blockchain_transactions(internal_id);
CREATE INDEX idx_bctx_entity ON public.blockchain_transactions(entity_type, operation);
CREATE INDEX idx_bctx_issuer ON public.blockchain_transactions(issuer_id);
CREATE INDEX idx_bctx_hash ON public.blockchain_transactions(stellar_tx_hash);

ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emissors read own blockchain tx"
ON public.blockchain_transactions FOR SELECT TO authenticated
USING (
  issuer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.issuers i WHERE i.id = blockchain_transactions.issuer_id AND i.user_id = auth.uid()
  )
);

CREATE POLICY "Actor reads own blockchain tx"
ON public.blockchain_transactions FOR SELECT TO authenticated
USING (actor_id = auth.uid());

CREATE POLICY "Authenticated reads all blockchain tx (audit)"
ON public.blockchain_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'emissor'::app_role));

ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS stellar_tx_hash text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stellar_tx_hash text;
ALTER TABLE public.issuer_funds ADD COLUMN IF NOT EXISTS last_stellar_tx_hash text;
ALTER TABLE public.issuer_beneficiaries ADD COLUMN IF NOT EXISTS stellar_tx_hash text;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS stellar_tx_hash text;
