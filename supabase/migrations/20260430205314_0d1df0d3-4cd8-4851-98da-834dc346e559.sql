
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('emissor', 'beneficiario', 'lojista');

-- Create enum for voucher status
CREATE TYPE public.voucher_status AS ENUM ('active', 'partially_used', 'used', 'expired', 'cancelled');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'confirmed', 'failed', 'reversed');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  cnpj TEXT,
  email TEXT NOT NULL,
  biometry_token TEXT,
  biometry_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles per security rules)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Issuers table
CREATE TABLE public.issuers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  fund_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Establishments (Estabelecimentos Credenciados)
CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  cnae TEXT NOT NULL,
  cnae_validated BOOLEAN NOT NULL DEFAULT false,
  address TEXT,
  geolocation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quantumcert_asset_id TEXT,
  issuer_id UUID REFERENCES public.issuers(id) ON DELETE CASCADE NOT NULL,
  beneficiary_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  beneficiary_cpf TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL CHECK (value > 0),
  remaining_value NUMERIC(15,2) NOT NULL CHECK (remaining_value >= 0),
  expiration_date DATE NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}',
  status voucher_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE NOT NULL,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  status transaction_status NOT NULL DEFAULT 'pending',
  transfero_tx_id TEXT,
  quantum_proof TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs (immutable)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_vouchers_beneficiary ON public.vouchers(beneficiary_id);
CREATE INDEX idx_vouchers_issuer ON public.vouchers(issuer_id);
CREATE INDEX idx_vouchers_status ON public.vouchers(status);
CREATE INDEX idx_vouchers_cpf ON public.vouchers(beneficiary_cpf);
CREATE INDEX idx_transactions_voucher ON public.transactions(voucher_id);
CREATE INDEX idx_transactions_establishment ON public.transactions(establishment_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_issuers_updated_at BEFORE UPDATE ON public.issuers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_establishments_updated_at BEFORE UPDATE ON public.establishments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles: users can read own roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Issuers: emissors read own, insert own
CREATE POLICY "Emissors read own issuer" ON public.issuers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Emissors update own issuer" ON public.issuers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Establishments: lojistas read own
CREATE POLICY "Lojistas read own establishment" ON public.establishments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Lojistas update own establishment" ON public.establishments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Vouchers: beneficiaries see their own, emissors see ones they issued
CREATE POLICY "Beneficiaries read own vouchers" ON public.vouchers FOR SELECT TO authenticated USING (auth.uid() = beneficiary_id);
CREATE POLICY "Emissors read issued vouchers" ON public.vouchers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.issuers WHERE issuers.id = vouchers.issuer_id AND issuers.user_id = auth.uid())
);
CREATE POLICY "Emissors insert vouchers" ON public.vouchers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.issuers WHERE issuers.id = issuer_id AND issuers.user_id = auth.uid())
);
CREATE POLICY "Emissors update vouchers" ON public.vouchers FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.issuers WHERE issuers.id = vouchers.issuer_id AND issuers.user_id = auth.uid())
);

-- Transactions: readable by involved parties
CREATE POLICY "Beneficiaries read own transactions" ON public.transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.vouchers WHERE vouchers.id = transactions.voucher_id AND vouchers.beneficiary_id = auth.uid())
);
CREATE POLICY "Establishments read own transactions" ON public.transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.establishments WHERE establishments.id = transactions.establishment_id AND establishments.user_id = auth.uid())
);
CREATE POLICY "Emissors read transactions" ON public.transactions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.vouchers v
    JOIN public.issuers i ON i.id = v.issuer_id
    WHERE v.id = transactions.voucher_id AND i.user_id = auth.uid()
  )
);

-- Audit logs: only emissors can read
CREATE POLICY "Emissors read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'emissor')
);
-- Anyone authenticated can insert audit logs
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
