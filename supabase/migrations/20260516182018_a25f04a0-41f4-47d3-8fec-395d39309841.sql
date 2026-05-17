
CREATE TABLE IF NOT EXISTS public.voucher_statuses (
  id text PRIMARY KEY,
  label text NOT NULL,
  tone text NOT NULL DEFAULT 'neutral',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voucher_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read voucher_statuses"
ON public.voucher_statuses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Emissores insert voucher_statuses"
ON public.voucher_statuses FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'emissor'::app_role));

CREATE POLICY "Emissores update voucher_statuses"
ON public.voucher_statuses FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'emissor'::app_role));

CREATE TRIGGER trg_voucher_statuses_updated
BEFORE UPDATE ON public.voucher_statuses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.voucher_statuses (id, label, tone, sort_order) VALUES
  ('active',         'Ativo',              'success', 1),
  ('partially_used', 'Parcialmente usado', 'info',    2),
  ('used',           'Usado',              'muted',   3),
  ('expired',        'Expirado',           'danger',  4),
  ('cancelled',      'Cancelado',          'muted',   5)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, tone = EXCLUDED.tone, sort_order = EXCLUDED.sort_order;
