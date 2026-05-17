
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS fee_percent numeric NOT NULL DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS tx_type text NOT NULL DEFAULT 'credit',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS voucher_category text,
  ADD COLUMN IF NOT EXISTS beneficiary_name text;

UPDATE public.transactions t
SET voucher_category = COALESCE(t.voucher_category, v.rules->>'category'),
    beneficiary_name = COALESCE(t.beneficiary_name, p.name, 'Cliente TIKIN')
FROM public.vouchers v
LEFT JOIN public.profiles p ON p.id = v.beneficiary_id
WHERE v.id = t.voucher_id;
