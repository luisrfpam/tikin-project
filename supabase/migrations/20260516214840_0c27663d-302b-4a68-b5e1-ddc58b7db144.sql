
CREATE TABLE public.charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lojistas insert own charges" ON public.charges
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.user_id = auth.uid()));

CREATE POLICY "Lojistas read own charges" ON public.charges
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.user_id = auth.uid()));

CREATE POLICY "Lojistas update own charges" ON public.charges
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.user_id = auth.uid()));

CREATE POLICY "Authenticated read charges for payment" ON public.charges
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated update charges on payment" ON public.charges
  FOR UPDATE TO authenticated
  USING (status = 'pending')
  WITH CHECK (status IN ('paid','pending'));

CREATE TRIGGER charges_updated_at BEFORE UPDATE ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_charges_establishment ON public.charges(establishment_id);
CREATE INDEX idx_charges_status ON public.charges(status);
