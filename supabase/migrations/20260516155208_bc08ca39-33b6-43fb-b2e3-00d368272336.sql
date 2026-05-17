DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE t text; tables text[] := ARRAY['profiles','issuers','establishments','vouchers','issuer_beneficiaries','issuer_funds'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', t);
  END LOOP;
END $$;

DELETE FROM public.issuer_beneficiaries
  WHERE issuer_id NOT IN (SELECT id FROM public.issuers)
     OR beneficiary_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.issuer_funds
  WHERE issuer_id NOT IN (SELECT id FROM public.issuers);

ALTER TABLE public.issuer_beneficiaries
  DROP CONSTRAINT IF EXISTS issuer_beneficiaries_issuer_id_fkey,
  ADD CONSTRAINT issuer_beneficiaries_issuer_id_fkey
    FOREIGN KEY (issuer_id) REFERENCES public.issuers(id) ON DELETE CASCADE;

ALTER TABLE public.issuer_beneficiaries
  DROP CONSTRAINT IF EXISTS issuer_beneficiaries_beneficiary_id_fkey,
  ADD CONSTRAINT issuer_beneficiaries_beneficiary_id_fkey
    FOREIGN KEY (beneficiary_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.issuer_beneficiaries
  DROP CONSTRAINT IF EXISTS issuer_beneficiaries_activated_by_fkey,
  ADD CONSTRAINT issuer_beneficiaries_activated_by_fkey
    FOREIGN KEY (activated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.issuer_funds
  DROP CONSTRAINT IF EXISTS issuer_funds_issuer_id_fkey,
  ADD CONSTRAINT issuer_funds_issuer_id_fkey
    FOREIGN KEY (issuer_id) REFERENCES public.issuers(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique ON public.profiles (cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cnpj_unique ON public.profiles (cnpj) WHERE cnpj IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles (lower(email));

ALTER TABLE public.vouchers
  DROP CONSTRAINT IF EXISTS vouchers_remaining_le_value_check,
  ADD CONSTRAINT vouchers_remaining_le_value_check CHECK (remaining_value <= value);

ALTER TABLE public.vouchers
  DROP CONSTRAINT IF EXISTS vouchers_cpf_format_check,
  ADD CONSTRAINT vouchers_cpf_format_check CHECK (beneficiary_cpf ~ '^[0-9]{11}$');

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_tx_type_check,
  ADD CONSTRAINT transactions_tx_type_check CHECK (tx_type IN ('credit','refund'));

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_fee_percent_check,
  ADD CONSTRAINT transactions_fee_percent_check CHECK (fee_percent >= 0 AND fee_percent <= 100);

ALTER TABLE public.establishments
  DROP CONSTRAINT IF EXISTS establishments_status_check,
  ADD CONSTRAINT establishments_status_check CHECK (status IN ('active','inactive','suspended'));

ALTER TABLE public.onboarding_requests
  DROP CONSTRAINT IF EXISTS onboarding_requests_status_check,
  ADD CONSTRAINT onboarding_requests_status_check CHECK (status IN ('pending','approved','rejected'));

DROP POLICY IF EXISTS "Emissors update onboarding requests" ON public.onboarding_requests;
CREATE POLICY "Emissors update onboarding requests"
  ON public.onboarding_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'emissor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'emissor'::app_role));

CREATE INDEX IF NOT EXISTS idx_vouchers_beneficiary ON public.vouchers (beneficiary_id) WHERE beneficiary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON public.vouchers (status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_establishments_status ON public.establishments (status);