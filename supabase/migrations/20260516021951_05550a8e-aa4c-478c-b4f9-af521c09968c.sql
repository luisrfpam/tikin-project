
-- Onboarding requests
CREATE TABLE public.onboarding_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request onboarding"
  ON public.onboarding_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Emissors read onboarding requests"
  ON public.onboarding_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'emissor'));

-- Lookup email by CPF or CNPJ for login
CREATE OR REPLACE FUNCTION public.lookup_email_by_identifier(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles
  WHERE cpf = _identifier OR cnpj = _identifier
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_email_by_identifier(text) TO anon, authenticated;
