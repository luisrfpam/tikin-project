
-- 1. issuer_stellar_wallets
CREATE TABLE public.issuer_stellar_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL UNIQUE,
  public_key text NOT NULL,
  secret_encrypted text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.issuer_stellar_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issuer owner reads own wallet"
  ON public.issuer_stellar_wallets FOR SELECT TO authenticated
  USING (public.is_issuer_owner(issuer_id, auth.uid()));

CREATE TRIGGER trg_issuer_stellar_wallets_updated
BEFORE UPDATE ON public.issuer_stellar_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. etherfuse_customers
CREATE TABLE public.etherfuse_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL UNIQUE,
  customer_id text NOT NULL,
  kyc_status text NOT NULL DEFAULT 'pending',
  kyc_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.etherfuse_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issuer owner reads own etherfuse customer"
  ON public.etherfuse_customers FOR SELECT TO authenticated
  USING (public.is_issuer_owner(issuer_id, auth.uid()));

CREATE TRIGGER trg_etherfuse_customers_updated
BEFORE UPDATE ON public.etherfuse_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. onramp_orders
CREATE TABLE public.onramp_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL,
  issuer_funds_id uuid,
  etherfuse_order_id text,
  amount_brl numeric NOT NULL,
  pix_qr text,
  pix_copy_paste text,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  stellar_tx_hash text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onramp_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issuer owner reads own onramp orders"
  ON public.onramp_orders FOR SELECT TO authenticated
  USING (public.is_issuer_owner(issuer_id, auth.uid()));

CREATE TRIGGER trg_onramp_orders_updated
BEFORE UPDATE ON public.onramp_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. issuer_funds extensions
ALTER TABLE public.issuer_funds
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS onramp_order_id uuid;
