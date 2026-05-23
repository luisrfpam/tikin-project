import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, User, Store, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { maskCPF, maskCNPJ, maskCEP, isValidCPF, isValidCNPJ, isValidCEP, isValidEmail } from '@/lib/validators';
import { useCategories } from '@/lib/categories';
import { getCanonicalAppOrigin } from '@/lib/appUrl';
import { DOC_MESSAGES } from '@/lib/documentMessages';

type Profile = 'empresa' | 'beneficiario' | 'lojista' | null;

type SignupMetadata = {
  name: string;
  role: 'emissor' | 'beneficiario' | 'lojista';
  cpf?: string;
  cnpj?: string;
  company_name?: string;
  razao_social?: string;
  responsible_name?: string;
  responsible_role?: string;
  corporate_email?: string;
  trade_name?: string;
  category?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  address?: string;
  contact_email?: string;
};

export default function RegisterPage() {
  const [profile, setProfile] = useState<Profile>(null);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Topbar */}
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/"><img src="/logo-fundo-branco.webp" alt="TIKIN" className="h-7" /></Link>
          <Link to="/" className="text-tikin-navy/50 text-sm font-bold border-l border-tikin-navy/10 pl-4 hidden sm:inline">
            ← Voltar ao site
          </Link>
        </div>
        <Link to="/login" className="text-tikin-navy text-sm font-extrabold hover:text-tikin-orange transition">
          Já tenho conta
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div
          className={`w-full max-w-2xl bg-white rounded-3xl shadow-elevated p-8 md:p-10 border-2 transition-colors ${
            profile === 'empresa' ? 'border-tikin-navy' :
            profile === 'lojista' ? 'border-tikin-orange' :
            profile === 'beneficiario' ? 'border-tikin-navy/20' :
            'border-transparent'
          }`}
        >
          <h1 className="font-heading text-3xl md:text-4xl font-black text-tikin-navy text-center mb-2">CRIE SUA CONTA</h1>
          <p className="text-center text-tikin-navy/60 mb-8">Como você deseja utilizar a TIKIN?</p>

          {!profile && <ProfileSelector onSelect={setProfile} />}
          {profile === 'empresa' && <EmpresaForm onBack={() => setProfile(null)} />}
          {profile === 'beneficiario' && <BeneficiarioForm onBack={() => setProfile(null)} />}
          {profile === 'lojista' && <LojistaForm onBack={() => setProfile(null)} />}
        </div>
      </div>
    </div>
  );
}

function ProfileSelector({ onSelect }: { onSelect: (p: Profile) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => onSelect('empresa')}
        className="bg-gradient-to-br from-white to-[#f4f6fa] border-2 border-tikin-navy/10 border-l-[6px] border-l-tikin-navy rounded-2xl p-6 flex items-center gap-5 text-left hover:-translate-y-1 transition shadow-md hover:shadow-xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-tikin-navy text-white flex items-center justify-center flex-shrink-0">
          <Building2 size={28} />
        </div>
        <div>
          <h3 className="font-heading text-lg font-black text-tikin-navy">SOU EMPRESA</h3>
          <p className="text-sm text-tikin-navy/70 mt-1">Emitente oficial. Quero gerenciar, distribuir benefícios e recuperar eficiências.</p>
        </div>
      </button>

      <button
        onClick={() => onSelect('beneficiario')}
        className="bg-white border-2 border-tikin-navy/10 rounded-2xl p-6 flex items-center gap-5 text-left hover:-translate-y-1 transition shadow-sm hover:shadow-lg"
      >
        <div className="w-14 h-14 rounded-full bg-[#F7F8FA] border border-tikin-navy/10 text-tikin-navy/60 flex items-center justify-center flex-shrink-0">
          <User size={26} />
        </div>
        <div>
          <h3 className="font-heading text-lg font-extrabold text-tikin-navy/80">SOU BENEFICIÁRIO</h3>
          <p className="text-sm text-tikin-navy/60 mt-1">Usuário final. Quero acessar meu saldo, gerar QR Code e acompanhar extratos.</p>
        </div>
      </button>

      <button
        onClick={() => onSelect('lojista')}
        className="bg-gradient-to-br from-white to-[#fff6ed] border-2 border-tikin-orange/15 border-l-[6px] border-l-tikin-orange rounded-2xl p-6 flex items-center gap-5 text-left hover:-translate-y-1 transition shadow-md hover:shadow-xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-tikin-orange text-white flex items-center justify-center flex-shrink-0">
          <Store size={28} />
        </div>
        <div>
          <h3 className="font-heading text-lg font-black text-tikin-navy">SOU LOJISTA</h3>
          <p className="text-sm text-tikin-navy/70 mt-1">Estabelecimento parceiro. Quero aceitar pagamentos com taxa fixa e liquidação no ato.</p>
        </div>
      </button>
    </div>
  );
}

function BackBtn({ onBack, color = 'navy' }: { onBack: () => void; color?: 'navy' | 'orange' }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`flex items-center gap-1 text-sm font-bold mb-5 ${color === 'orange' ? 'text-tikin-orange' : 'text-tikin-navy'} hover:underline`}
    >
      <ArrowLeft size={14} /> Voltar
    </button>
  );
}

async function signupCommon(email: string, password: string, metadata: SignupMetadata) {
  const redirectPath = metadata.role === 'beneficiario' || metadata.role === 'lojista'
    ? '/ativar-cadastro'
    : '/login';
  const emailRedirectTo = `${getCanonicalAppOrigin()}${redirectPath}`;

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo,
    },
  });

  // Se não houver sessão ativa após signup, o projeto exige confirmação por e-mail.
  // Tentamos reenvio explícito para reduzir casos em que o usuário não recebe a primeira mensagem.
  if (!result.error && result.data.user && !result.data.session) {
    try {
      await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo },
      });
    } catch (resendError) {
      console.warn('Falha ao reenviar email de signup', resendError);
    }
  }

  return result;
}

function getSignupErrorMessage(errorMessage?: string) {
  const msg = (errorMessage || '').toLowerCase();
  if (!msg) return 'Não foi possível concluir o cadastro. Tente novamente.';

  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'E-mail já cadastrado. Faça login ou recupere sua senha.';
  }

  if (msg.includes('database error saving new user')) {
    return 'CPF/CNPJ já cadastrado. Faça login ou recupere sua conta.';
  }

  return errorMessage || 'Não foi possível concluir o cadastro. Tente novamente.';
}

async function ensureIdentifierAvailable(identifier: string, label: 'CPF' | 'CNPJ') {
  const digits = identifier.replace(/\D/g, '');
  if (!digits) return;

  const { data, error } = await supabase.rpc('lookup_email_by_identifier', { _identifier: digits });
  if (error) return;

  if (data) {
    throw new Error(`${label} já cadastrado. Use outro ${label} ou faça login/recupere sua conta.`);
  }
}

function EmpresaForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ razao_social: '', cnpj: '', responsible_name: '', responsible_role: '', corporate_email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const errorClass = 'border-red-500 focus-visible:ring-red-500';
  const razaoSocialValid = Boolean(form.razao_social.trim());
  const cnpjValid = isValidCNPJ(form.cnpj);
  const responsibleNameValid = Boolean(form.responsible_name.trim());
  const responsibleRoleValid = Boolean(form.responsible_role.trim());
  const corporateEmail = form.corporate_email.trim().toLowerCase();
  const corporateEmailValid = isValidEmail(corporateEmail);
  const passwordValid = form.password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setSubmitAttempted(true);

    if (!razaoSocialValid) return toast.error('Informe a razão social');
    if (!cnpjValid) return toast.error(DOC_MESSAGES.cnpjInvalid);
    if (!responsibleNameValid) return toast.error('Informe o nome do responsável');
    if (!responsibleRoleValid) return toast.error('Informe o cargo');
    if (!corporateEmailValid) return toast.error('E-mail corporativo inválido');
    if (!passwordValid) return toast.error('Senha deve ter no mínimo 6 caracteres');

    setLoading(true);
    try {
      await ensureIdentifierAvailable(form.cnpj, 'CNPJ');
    } catch (e: any) {
      setLoading(false);
      return toast.error(e?.message || 'CNPJ já cadastrado.');
    }
    const { data, error } = await signupCommon(corporateEmail, form.password, {
      name: form.responsible_name,
      role: 'emissor',
      cnpj: form.cnpj,
      company_name: form.razao_social,
      razao_social: form.razao_social,
      responsible_name: form.responsible_name,
      responsible_role: form.responsible_role,
      corporate_email: corporateEmail,
    });
    if (error) { toast.error(getSignupErrorMessage(error.message)); setLoading(false); return; }

    // Provisiona carteira Stellar própria do emissor após o registro.
    // O trigger no banco cria o registro de issuer; aqui apenas vinculamos a carteira.
    if (data.user) {
      const { data: createdIssuer } = await supabase
        .from('issuers')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (createdIssuer?.id) {
        try {
          await supabase.functions.invoke('stellar-ensure-wallet', { body: { issuer_id: createdIssuer.id } });
        } catch (e) {
          console.error('ensure wallet', e);
        }
      }
    }
    toast.success('Cadastro enviado! O time da TIKiN analisará e liberará seu acesso.');
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('signOut after empresa signup', signOutError);
      }
    setLoading(false);
      navigate('/emissor/aguardando-aprovacao', { replace: true });
  };

  return (
    <div>
      <BackBtn onBack={onBack} />
      <h2 className="font-heading text-2xl font-black text-tikin-navy mb-6">CADASTRO DE EMPRESA</h2>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <Input
            placeholder="Razão Social"
            required
            value={form.razao_social}
            onChange={e => set('razao_social', e.target.value)}
            className={submitAttempted && !razaoSocialValid ? errorClass : ''}
          />
          {submitAttempted && !razaoSocialValid && (
            <p className="mt-1 text-[11px] font-medium text-red-600">Informe a razão social.</p>
          )}
        </div>
        <div>
          <Input
            placeholder="CNPJ"
            required
            inputMode="numeric"
            value={form.cnpj}
            onChange={e => set('cnpj', maskCNPJ(e.target.value))}
            className={submitAttempted && !cnpjValid ? errorClass : ''}
          />
          {submitAttempted && !cnpjValid && (
            <p className="mt-1 text-[11px] font-medium text-red-600">{DOC_MESSAGES.cnpjInvalid}</p>
          )}
        </div>
        <div>
          <Input
            placeholder="Nome Completo do Responsável"
            required
            value={form.responsible_name}
            onChange={e => set('responsible_name', e.target.value)}
            className={submitAttempted && !responsibleNameValid ? errorClass : ''}
          />
          {submitAttempted && !responsibleNameValid && (
            <p className="mt-1 text-[11px] font-medium text-red-600">Informe o nome do responsável.</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              placeholder="Cargo"
              required
              value={form.responsible_role}
              onChange={e => set('responsible_role', e.target.value)}
              className={submitAttempted && !responsibleRoleValid ? errorClass : ''}
            />
            {submitAttempted && !responsibleRoleValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">Informe o cargo.</p>
            )}
          </div>
          <div>
            <Input
              type="email"
              placeholder="E-mail Corporativo"
              required
              value={form.corporate_email}
              onChange={e => set('corporate_email', e.target.value)}
              className={submitAttempted && !corporateEmailValid ? errorClass : ''}
            />
            {submitAttempted && !corporateEmailValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">E-mail corporativo inválido.</p>
            )}
          </div>
        </div>
        <div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Criar Senha de Acesso (mín. 6 caracteres)"
              required
              minLength={6}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className={`pr-11 ${submitAttempted && !passwordValid ? errorClass : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/50 hover:text-tikin-navy"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {submitAttempted && !passwordValid && (
            <p className="mt-1 text-[11px] font-medium text-red-600">Senha deve ter no mínimo 6 caracteres.</p>
          )}
        </div>
        <Button type="submit" disabled={loading} className="bg-tikin-navy hover:bg-tikin-navy/90 text-white font-heading font-extrabold py-6 mt-2">
          {loading ? 'Enviando...' : 'Enviar cadastro para análise'}
        </Button>
      </form>
    </div>
  );
}

function BeneficiarioForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', cpf: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const errorClass = 'border-red-500 focus-visible:ring-red-500';
  const nameValid = Boolean(form.name.trim());
  const cpfValid = isValidCPF(form.cpf);
  const personalEmail = form.email.trim().toLowerCase();
  const emailValid = isValidEmail(personalEmail);
  const passwordValid = form.password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setSubmitAttempted(true);

    if (!nameValid) return toast.error('Informe seu nome');
    if (!cpfValid) return toast.error(DOC_MESSAGES.cpfInvalid);
    if (!emailValid) return toast.error('E-mail inválido');
    if (!passwordValid) return toast.error('Senha deve ter no mínimo 6 caracteres');

    setLoading(true);
    try {
      await ensureIdentifierAvailable(form.cpf, 'CPF');
    } catch (e: any) {
      setLoading(false);
      return toast.error(e?.message || 'CPF já cadastrado.');
    }
    const { data, error } = await signupCommon(personalEmail, form.password, {
      name: form.name,
      role: 'beneficiario',
      cpf: form.cpf,
    });
    if (error) { toast.error(getSignupErrorMessage(error.message)); setLoading(false); return; }
    toast.success('Conta criada! Verifique seu e-mail para confirmar.');
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('signOut after beneficiary signup', signOutError);
    }
    setLoading(false);
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <BackBtn onBack={onBack} />
      <h2 className="font-heading text-2xl font-black text-tikin-navy mb-6">ATIVAR CONTA BENEFICIÁRIO</h2>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <Input
            placeholder="Nome Completo"
            required
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className={submitAttempted && !nameValid ? errorClass : ''}
          />
          {submitAttempted && !nameValid && (
            <p className="mt-1 text-[11px] font-medium text-red-600">Informe seu nome.</p>
          )}
        </div>
        <div>
          <Input
            placeholder="CPF"
            required
            inputMode="numeric"
            value={form.cpf}
            onChange={e => set('cpf', maskCPF(e.target.value))}
            className={submitAttempted && !cpfValid ? errorClass : ''}
          />
          {submitAttempted && !cpfValid && (
            <p className="mt-1 text-[11px] font-medium text-red-600">{DOC_MESSAGES.cpfInvalid}</p>
          )}
        </div>
        <div>
          <Input
            type="email"
            placeholder="E-mail Pessoal"
            required
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className={submitAttempted && !emailValid ? errorClass : ''}
          />
          {submitAttempted && !emailValid && (
            <p className="mt-1 text-[11px] font-medium text-red-600">E-mail inválido.</p>
          )}
        </div>
        <div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Criar Senha (mín. 6 caracteres)"
              required
              minLength={6}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className={`pr-11 ${submitAttempted && !passwordValid ? errorClass : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/50 hover:text-tikin-navy"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {submitAttempted && !passwordValid && (
            <p className="mt-1 text-[11px] font-medium text-red-600">Senha deve ter no mínimo 6 caracteres.</p>
          )}
        </div>
        <Button type="submit" disabled={loading} className="bg-tikin-navy hover:bg-tikin-navy/90 text-white font-heading font-extrabold py-6">
          {loading ? 'Criando...' : 'Cadastrar e Entrar'}
        </Button>
      </form>
    </div>
  );
}

function LojistaForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const cats = useCategories();
  const [form, setForm] = useState({
    trade_name: '', razao_social: '', cnpj: '', category: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    email: '', password: '',
  });
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepValidated, setCepValidated] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const errorClass = 'border-red-500 focus-visible:ring-red-500';
  const tradeNameValid = Boolean(form.trade_name.trim());
  const razaoSocialValid = Boolean(form.razao_social.trim());
  const cnpjDigits = form.cnpj.replace(/\D/g, '');
  const cnpjValid = cnpjDigits.length === 14 && isValidCNPJ(form.cnpj);
  const categorySelected = form.category.trim();
  const isCategoryValid = categorySelected.length > 0 && cats.some(c => c.id === categorySelected);
  const hasCepDigits = form.cep.replace(/\D/g, '').length > 0;
  const cepBasicValid = isValidCEP(form.cep);
  const logradouroValid = Boolean(form.logradouro.trim());
  const numeroValid = Boolean(form.numero.trim());
  const bairroValid = Boolean(form.bairro.trim());
  const cidadeValid = Boolean(form.cidade.trim());
  const ufValid = Boolean(form.uf.trim());
  const normalizedEmail = form.email.trim().toLowerCase();
  const emailValid = isValidEmail(normalizedEmail);
  const passwordValid = form.password.length >= 6;
  const isCepReady =
    cepBasicValid &&
    cepValidated &&
    !cepLoading &&
    logradouroValid &&
    bairroValid &&
    cidadeValid &&
    ufValid;

  const handleCepChange = async (raw: string) => {
    const masked = maskCEP(raw);
    setCepValidated(false);
    setForm(f => ({
      ...f,
      cep: masked,
      logradouro: '',
      bairro: '',
      cidade: '',
      uf: '',
    }));

    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          toast.error('CEP não encontrado');
        } else {
          const hasRequiredAddress = Boolean(
            data.logradouro?.trim() &&
            data.bairro?.trim() &&
            data.localidade?.trim() &&
            data.uf?.trim()
          );

          if (!hasRequiredAddress) {
            toast.error('CEP incompleto. Informe um CEP que retorne endereço completo.');
            return;
          }

          setForm(f => ({
            ...f,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            uf: data.uf || '',
          }));
          setCepValidated(true);
        }
      } catch {
        toast.error('Falha ao buscar CEP');
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setSubmitAttempted(true);

    if (!form.trade_name.trim()) return toast.error('Informe o nome fantasia');
    if (!form.razao_social.trim()) return toast.error('Informe a razão social');
    if (!isValidCNPJ(form.cnpj)) return toast.error(DOC_MESSAGES.cnpjInvalid);
    if (!categorySelected) return toast.error('Selecione a regra de uso (categoria principal).');
    if (!cats.some(c => c.id === categorySelected)) return toast.error('Selecione uma regra de uso válida.');

    if (!isValidCEP(form.cep)) return toast.error('CEP inválido');
    if (cepLoading) return toast.error('Aguarde a validação do CEP.');
    if (!cepValidated) return toast.error('Informe um CEP válido que preencha o endereço automaticamente.');

    if (!form.logradouro.trim()) return toast.error('Informe um CEP válido que preencha o logradouro.');
    if (!form.numero.trim()) return toast.error('Informe o número');
    if (!form.bairro.trim()) return toast.error('Informe um CEP válido que preencha o bairro.');
    if (!form.cidade.trim()) return toast.error('Informe um CEP válido que preencha a cidade.');
    if (!form.uf.trim()) return toast.error('Informe um CEP válido que preencha a UF.');
    if (!isValidEmail(normalizedEmail)) return toast.error('E-mail inválido');
    if (form.password.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres');
    const fullAddress = `${form.logradouro}, ${form.numero}${form.complemento ? ' - ' + form.complemento : ''} - ${form.bairro}, ${form.cidade}/${form.uf}`;

    setLoading(true);
    try {
      await ensureIdentifierAvailable(form.cnpj, 'CNPJ');
    } catch (e: any) {
      setLoading(false);
      return toast.error(e?.message || 'CNPJ já cadastrado.');
    }
    const { data, error } = await signupCommon(normalizedEmail, form.password, {
      name: form.trade_name,
      role: 'lojista',
      cnpj: form.cnpj,
      trade_name: form.trade_name,
      company_name: form.razao_social,
      category: categorySelected,
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
      address: fullAddress,
      contact_email: normalizedEmail,
    });
    if (error) { toast.error(getSignupErrorMessage(error.message)); setLoading(false); return; }
    toast.success('Conta criada! Verifique seu e-mail para confirmar.');
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('signOut after merchant signup', signOutError);
    }
    setLoading(false);
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <BackBtn onBack={onBack} color="orange" />
      <h2 className="font-heading text-2xl font-black text-tikin-navy mb-6">CREDENCIAR ESTABELECIMENTO</h2>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          placeholder="Nome Fantasia"
          required
          value={form.trade_name}
          onChange={e => set('trade_name', e.target.value)}
          className={submitAttempted && !tradeNameValid ? errorClass : ''}
        />
        {submitAttempted && !tradeNameValid && (
          <p className="-mt-2 text-[11px] font-medium text-red-600">Informe o nome fantasia.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              placeholder="Razão Social"
              required
              value={form.razao_social}
              onChange={e => set('razao_social', e.target.value)}
              className={submitAttempted && !razaoSocialValid ? errorClass : ''}
            />
            {submitAttempted && !razaoSocialValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">Informe a razão social.</p>
            )}
          </div>
          <div>
            <Input
              placeholder="CNPJ"
              required
              inputMode="numeric"
              value={form.cnpj}
              onChange={e => set('cnpj', maskCNPJ(e.target.value))}
              className={submitAttempted && !cnpjValid ? errorClass : ''}
            />
            {submitAttempted && !cnpjValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">{DOC_MESSAGES.cnpjInvalid}</p>
            )}
          </div>
        </div>
        <Select value={form.category} onValueChange={v => set('category', v)}>
          <SelectTrigger className={submitAttempted && !isCategoryValid ? errorClass : ''}>
            <SelectValue placeholder="Categoria Principal (Regra de Uso)" />
          </SelectTrigger>
          <SelectContent>
            {cats.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {submitAttempted && !isCategoryValid && (
          <p className="-mt-2 text-[11px] font-medium text-red-600">Selecione a regra de uso (categoria principal).</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder={cepLoading ? 'Buscando CEP...' : 'CEP'}
              required
              inputMode="numeric"
              value={form.cep}
              onChange={e => handleCepChange(e.target.value)}
              className={submitAttempted && (!cepBasicValid || !isCepReady) ? errorClass : ''}
            />
            {submitAttempted && !cepBasicValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">CEP inválido.</p>
            )}
          </div>
          <div className="md:col-span-2">
            <Input
              placeholder="Logradouro (Rua/Av.)"
              required
              value={form.logradouro}
              readOnly
              className={submitAttempted && !logradouroValid ? errorClass : ''}
            />
            {submitAttempted && !logradouroValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">Logradouro não preenchido pelo CEP.</p>
            )}
          </div>
        </div>
        {submitAttempted && hasCepDigits && !isCepReady && (
          <p className="-mt-2 text-[11px] font-medium text-red-600">Informe um CEP válido que preencha logradouro, bairro, cidade e UF automaticamente.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder="Número"
              required
              value={form.numero}
              onChange={e => set('numero', e.target.value)}
              className={submitAttempted && !numeroValid ? errorClass : ''}
            />
            {submitAttempted && !numeroValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">Informe o número.</p>
            )}
          </div>
          <Input placeholder="Complemento (opcional)" className="md:col-span-2" value={form.complemento} onChange={e => set('complemento', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Bairro"
              required
              value={form.bairro}
              readOnly
              className={submitAttempted && !bairroValid ? errorClass : ''}
            />
            {submitAttempted && !bairroValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">Bairro não preenchido pelo CEP.</p>
            )}
          </div>
          <div className="relative">
            <Input
              placeholder="Cidade"
              required
              value={form.cidade}
              readOnly
              className={`bg-[#F5F7FB] border-dashed border-tikin-navy/25 pr-9 text-tikin-navy/70 cursor-not-allowed ${submitAttempted && !cidadeValid ? errorClass : ''}`}
            />
            <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/45 pointer-events-none" />
            {submitAttempted && !cidadeValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">Cidade não preenchida pelo CEP.</p>
            )}
          </div>
          <div className="relative">
            <Input
              placeholder="UF"
              required
              maxLength={2}
              value={form.uf}
              readOnly
              className={`bg-[#F5F7FB] border-dashed border-tikin-navy/25 pr-9 text-tikin-navy/70 cursor-not-allowed ${submitAttempted && !ufValid ? errorClass : ''}`}
            />
            <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/45 pointer-events-none" />
            {submitAttempted && !ufValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">UF não preenchida pelo CEP.</p>
            )}
          </div>
        </div>
        <p className="-mt-2 text-[11px] font-medium text-tikin-navy/55">Cidade e UF são preenchidos automaticamente a partir do CEP.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              type="email"
              placeholder="E-mail de Contato"
              required
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={submitAttempted && !emailValid ? errorClass : ''}
            />
            {submitAttempted && !emailValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">E-mail inválido.</p>
            )}
          </div>
          <div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Criar Senha (mín. 6 caracteres)"
                required
                minLength={6}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className={`pr-11 ${submitAttempted && !passwordValid ? errorClass : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/50 hover:text-tikin-navy"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {submitAttempted && !passwordValid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">Senha deve ter no mínimo 6 caracteres.</p>
            )}
          </div>
        </div>
        <Button type="submit" disabled={loading} className="bg-tikin-orange hover:bg-tikin-orange/90 text-white font-heading font-extrabold py-6 mt-2">
          {loading ? 'Criando...' : 'Finalizar Credenciamento'}
        </Button>
      </form>
    </div>
  );
}
