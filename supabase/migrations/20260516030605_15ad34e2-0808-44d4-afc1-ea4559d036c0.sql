
-- 1. Extend establishments
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS accepted_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7);

-- Allow beneficiaries (any authenticated user) to read establishments to find places that accept their vouchers
DROP POLICY IF EXISTS "Authenticated read establishments" ON public.establishments;
CREATE POLICY "Authenticated read establishments"
  ON public.establishments FOR SELECT
  TO authenticated
  USING (true);

-- 2. Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (beneficiary_id, establishment_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beneficiaries read own favorites" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = beneficiary_id);
CREATE POLICY "Beneficiaries insert own favorites" ON public.favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = beneficiary_id);
CREATE POLICY "Beneficiaries delete own favorites" ON public.favorites
  FOR DELETE TO authenticated USING (auth.uid() = beneficiary_id);

-- 3. Seed sample data on existing establishments (São Paulo area)
UPDATE public.establishments SET
  phone = '(11) 4002-8001',
  opening_hours = 'Seg-Sex 07h-20h · Sáb 08h-14h',
  accepted_categories = ARRAY['alimentação','refeição'],
  latitude = -23.5610, longitude = -46.6560,
  cidade = COALESCE(cidade,'São Paulo'), uf = COALESCE(uf,'SP'),
  logradouro = COALESCE(logradouro,'Rua Augusta'), numero = COALESCE(numero,'1200'),
  bairro = COALESCE(bairro,'Consolação'),
  address = COALESCE(address,'Rua Augusta, 1200 - Consolação, São Paulo - SP')
WHERE name = 'Padaria Pão Dourado LTDA';

UPDATE public.establishments SET
  phone = '(11) 3145-9000',
  opening_hours = 'Todos os dias 08h-22h',
  accepted_categories = ARRAY['farmácia','saúde'],
  latitude = -23.5680, longitude = -46.6490,
  cidade = COALESCE(cidade,'São Paulo'), uf = COALESCE(uf,'SP'),
  logradouro = COALESCE(logradouro,'Av. Paulista'), numero = COALESCE(numero,'900'),
  bairro = COALESCE(bairro,'Bela Vista'),
  address = COALESCE(address,'Av. Paulista, 900 - Bela Vista, São Paulo - SP')
WHERE name = 'Farmácia Vida Saudável LTDA';

UPDATE public.establishments SET
  phone = '(11) 5571-2200',
  opening_hours = 'Seg-Dom 07h-23h',
  accepted_categories = ARRAY['alimentação'],
  latitude = -23.5870, longitude = -46.6580,
  cidade = COALESCE(cidade,'São Paulo'), uf = COALESCE(uf,'SP'),
  logradouro = COALESCE(logradouro,'Rua Vergueiro'), numero = COALESCE(numero,'2500'),
  bairro = COALESCE(bairro,'Vila Mariana'),
  address = COALESCE(address,'Rua Vergueiro, 2500 - Vila Mariana, São Paulo - SP')
WHERE name = 'Mercado Bom Preço LTDA';

UPDATE public.establishments SET
  phone = '(11) 3061-7700',
  opening_hours = 'Ter-Dom 11h30-23h',
  accepted_categories = ARRAY['alimentação','refeição'],
  latitude = -23.5640, longitude = -46.6700,
  cidade = COALESCE(cidade,'São Paulo'), uf = COALESCE(uf,'SP'),
  logradouro = COALESCE(logradouro,'Rua Oscar Freire'), numero = COALESCE(numero,'725'),
  bairro = COALESCE(bairro,'Jardins'),
  address = COALESCE(address,'Rua Oscar Freire, 725 - Jardins, São Paulo - SP')
WHERE name = 'Sabor & Arte Restaurante LTDA';

UPDATE public.establishments SET
  phone = '(11) 2362-4400',
  opening_hours = '24 horas',
  accepted_categories = ARRAY['transporte','combustível'],
  latitude = -23.5320, longitude = -46.6380,
  cidade = COALESCE(cidade,'São Paulo'), uf = COALESCE(uf,'SP'),
  logradouro = COALESCE(logradouro,'Av. Tiradentes'), numero = COALESCE(numero,'500'),
  bairro = COALESCE(bairro,'Luz'),
  address = COALESCE(address,'Av. Tiradentes, 500 - Luz, São Paulo - SP')
WHERE name = 'Auto Posto Centro LTDA';

UPDATE public.establishments SET
  phone = '(11) 3170-4033',
  opening_hours = 'Seg-Sáb 10h-22h · Dom 12h-20h',
  accepted_categories = ARRAY['educação','cultura'],
  latitude = -23.5615, longitude = -46.6560,
  cidade = COALESCE(cidade,'São Paulo'), uf = COALESCE(uf,'SP'),
  logradouro = COALESCE(logradouro,'Av. Paulista'), numero = COALESCE(numero,'2073'),
  bairro = COALESCE(bairro,'Bela Vista'),
  address = COALESCE(address,'Av. Paulista, 2073 - Bela Vista, São Paulo - SP')
WHERE name = 'Livraria Cultura S/A';
