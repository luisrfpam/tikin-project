
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.issuers
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS responsible_name TEXT,
  ADD COLUMN IF NOT EXISTS responsible_role TEXT,
  ADD COLUMN IF NOT EXISTS corporate_email TEXT;

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;
