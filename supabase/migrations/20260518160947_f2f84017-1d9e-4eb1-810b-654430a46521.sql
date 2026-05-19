-- merchant_pix_keys
CREATE TABLE public.merchant_pix_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  key_type text NOT NULL CHECK (key_type IN ('cpf','cnpj','email','phone','random')),
  key_value text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (establishment_id, key_value)
);

CREATE UNIQUE INDEX merchant_pix_keys_one_default
  ON public.merchant_pix_keys (establishment_id)
  WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.enforce_pix_key_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.merchant_pix_keys WHERE establishment_id = NEW.establishment_id;
  IF c >= 3 THEN
    RAISE EXCEPTION 'Limite de 3 chaves PIX por estabelecimento atingido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pix_key_limit
BEFORE INSERT ON public.merchant_pix_keys
FOR EACH ROW EXECUTE FUNCTION public.enforce_pix_key_limit();

CREATE TRIGGER trg_pix_key_updated_at
BEFORE UPDATE ON public.merchant_pix_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.merchant_pix_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant reads own pix keys" ON public.merchant_pix_keys
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.user_id = auth.uid()));

CREATE POLICY "Merchant inserts own pix keys" ON public.merchant_pix_keys
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.user_id = auth.uid()));

CREATE POLICY "Merchant updates own pix keys" ON public.merchant_pix_keys
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.user_id = auth.uid()));

CREATE POLICY "Merchant deletes own pix keys" ON public.merchant_pix_keys
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.user_id = auth.uid()));

-- Also allow off-ramp edge function (via service role) is bypass; expose default key to anyone who needs to pay? Not needed; edge functions use service role.

-- offramp_orders
CREATE TABLE public.offramp_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  issuer_id uuid NOT NULL,
  voucher_id uuid NOT NULL,
  amount_brl numeric NOT NULL,
  pix_key_value text,
  pix_key_type text,
  etherfuse_order_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','burning','burned','paid','failed')),
  stellar_burn_tx_hash text,
  pix_paid_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_offramp_updated_at
BEFORE UPDATE ON public.offramp_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.offramp_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant reads own offramp orders" ON public.offramp_orders
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.user_id = auth.uid()));

CREATE POLICY "Issuer reads own offramp orders" ON public.offramp_orders
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.issuers i WHERE i.id = issuer_id AND i.user_id = auth.uid()));
