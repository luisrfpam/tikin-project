
-- Helper: is_issuer_owner
CREATE OR REPLACE FUNCTION public.is_issuer_owner(_issuer_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.issuers WHERE id = _issuer_id AND user_id = _user_id);
$$;

-- issuer_beneficiaries
CREATE TABLE public.issuer_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL,
  beneficiary_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  activated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer_id, beneficiary_id)
);
CREATE INDEX idx_ib_issuer ON public.issuer_beneficiaries(issuer_id);
CREATE INDEX idx_ib_benef ON public.issuer_beneficiaries(beneficiary_id);
ALTER TABLE public.issuer_beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issuer owner reads links" ON public.issuer_beneficiaries
  FOR SELECT TO authenticated USING (public.is_issuer_owner(issuer_id, auth.uid()));
CREATE POLICY "Beneficiary reads own links" ON public.issuer_beneficiaries
  FOR SELECT TO authenticated USING (beneficiary_id = auth.uid());
CREATE POLICY "Issuer owner inserts links" ON public.issuer_beneficiaries
  FOR INSERT TO authenticated WITH CHECK (public.is_issuer_owner(issuer_id, auth.uid()));
CREATE POLICY "Issuer owner updates links" ON public.issuer_beneficiaries
  FOR UPDATE TO authenticated USING (public.is_issuer_owner(issuer_id, auth.uid()));

CREATE TRIGGER trg_ib_updated BEFORE UPDATE ON public.issuer_beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- issuer_funds
CREATE TABLE public.issuer_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL,
  month date NOT NULL,
  monthly_budget numeric NOT NULL DEFAULT 0 CHECK (monthly_budget >= 0),
  allocated numeric NOT NULL DEFAULT 0 CHECK (allocated >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer_id, month)
);
CREATE INDEX idx_if_issuer ON public.issuer_funds(issuer_id);
ALTER TABLE public.issuer_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issuer owner reads funds" ON public.issuer_funds
  FOR SELECT TO authenticated USING (public.is_issuer_owner(issuer_id, auth.uid()));
CREATE POLICY "Issuer owner inserts funds" ON public.issuer_funds
  FOR INSERT TO authenticated WITH CHECK (public.is_issuer_owner(issuer_id, auth.uid()));
CREATE POLICY "Issuer owner updates funds" ON public.issuer_funds
  FOR UPDATE TO authenticated USING (public.is_issuer_owner(issuer_id, auth.uid()));

CREATE TRIGGER trg_if_updated BEFORE UPDATE ON public.issuer_funds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- consume_issuer_funds: validates and increments
CREATE OR REPLACE FUNCTION public.consume_issuer_funds(_issuer_id uuid, _value numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  m date := date_trunc('month', now())::date;
  rec public.issuer_funds%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.issuer_funds WHERE issuer_id = _issuer_id AND month = m FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento do mês não configurado';
  END IF;
  IF rec.allocated + _value > rec.monthly_budget THEN
    RAISE EXCEPTION 'Saldo de fundos insuficiente para o mês';
  END IF;
  UPDATE public.issuer_funds SET allocated = allocated + _value WHERE id = rec.id;
END;
$$;
