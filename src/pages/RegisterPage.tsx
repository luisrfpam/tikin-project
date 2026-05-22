import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, User, Store, ArrowLeft, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { maskCPF, maskCNPJ, maskCEP, isValidCPF, isValidCNPJ, isValidCEP, isValidEmail } from '@/lib/validators';
import { useCategories } from '@/lib/categories';
import { getCanonicalAppOrigin } from '@/lib/appUrl';

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
          <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
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
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    });
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
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.razao_social.trim()) return toast.error('Informe a razão social');
    if (!isValidCNPJ(form.cnpj)) return toast.error('CNPJ inválido');
    if (!form.responsible_name.trim()) return toast.error('Informe o nome do responsável');
    if (!form.responsible_role.trim()) return toast.error('Informe o cargo');
    if (!isValidEmail(form.corporate_email)) return toast.error('E-mail corporativo inválido');
    if (form.password.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres');
    try {
      await ensureIdentifierAvailable(form.cnpj, 'CNPJ');
    } catch (e: any) {
      return toast.error(e?.message || 'CNPJ já cadastrado.');
    }
    setLoading(true);
    const { data, error } = await signupCommon(form.corporate_email, form.password, {
      name: form.responsible_name,
      role: 'emissor',
      cnpj: form.cnpj,
      company_name: form.razao_social,
      razao_social: form.razao_social,
      responsible_name: form.responsible_name,
      responsible_role: form.responsible_role,
      corporate_email: form.corporate_email,
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
    setLoading(false);
    navigate('/emissor/aguardando-aprovacao');
  };

  return (
    <div>
      <BackBtn onBack={onBack} />
      <h2 className="font-heading text-2xl font-black text-tikin-navy mb-6">CADASTRO DE EMPRESA</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input placeholder="Razão Social" required value={form.razao_social} onChange={e => set('razao_social', e.target.value)} />
        <Input placeholder="CNPJ" required inputMode="numeric" value={form.cnpj} onChange={e => set('cnpj', maskCNPJ(e.target.value))} />
        <Input placeholder="Nome Completo do Responsável" required value={form.responsible_name} onChange={e => set('responsible_name', e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Cargo" required value={form.responsible_role} onChange={e => set('responsible_role', e.target.value)} />
          <Input type="email" placeholder="E-mail Corporativo" required value={form.corporate_email} onChange={e => set('corporate_email', e.target.value)} />
        </div>
        <Input type="password" placeholder="Criar Senha de Acesso (mín. 6 caracteres)" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} />
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
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe seu nome');
    if (!isValidCPF(form.cpf)) return toast.error('CPF inválido');
    if (!isValidEmail(form.email)) return toast.error('E-mail inválido');
    if (form.password.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres');
    try {
      await ensureIdentifierAvailable(form.cpf, 'CPF');
    } catch (e: any) {
      return toast.error(e?.message || 'CPF já cadastrado.');
    }
    setLoading(true);
    const { data, error } = await signupCommon(form.email, form.password, {
      name: form.name,
      role: 'beneficiario',
      cpf: form.cpf,
    });
    if (error) { toast.error(getSignupErrorMessage(error.message)); setLoading(false); return; }
    toast.success('Conta criada! Verifique seu e-mail para confirmar.');
    setLoading(false);
    navigate('/login');
  };

  return (
    <div>
      <BackBtn onBack={onBack} />
      <h2 className="font-heading text-2xl font-black text-tikin-navy mb-6">ATIVAR CONTA BENEFICIÁRIO</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input placeholder="Nome Completo" required value={form.name} onChange={e => set('name', e.target.value)} />
        <Input placeholder="CPF" required inputMode="numeric" value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} />
        <Input type="email" placeholder="E-mail Pessoal" required value={form.email} onChange={e => set('email', e.target.value)} />
        <Input type="password" placeholder="Criar Senha (mín. 6 caracteres)" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} />
        <p className="text-sm text-tikin-navy/60 text-center">Sua biometria facial será solicitada no primeiro acesso ao aplicativo.</p>
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
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCepChange = async (raw: string) => {
    const masked = maskCEP(raw);
    setForm(f => ({ ...f, cep: masked }));
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          toast.error('CEP não encontrado');
        } else {
          setForm(f => ({
            ...f,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            uf: data.uf || '',
          }));
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
    if (!form.trade_name.trim()) return toast.error('Informe o nome fantasia');
    if (!form.razao_social.trim()) return toast.error('Informe a razão social');
    if (!isValidCNPJ(form.cnpj)) return toast.error('CNPJ inválido');
    if (!form.category) return toast.error('Selecione uma categoria');
    if (!isValidCEP(form.cep)) return toast.error('CEP inválido');
    if (!form.logradouro.trim()) return toast.error('Informe o logradouro');
    if (!form.numero.trim()) return toast.error('Informe o número');
    if (!form.bairro.trim()) return toast.error('Informe o bairro');
    if (!form.cidade.trim()) return toast.error('Informe a cidade');
    if (!form.uf.trim()) return toast.error('Informe a UF');
    if (!isValidEmail(form.email)) return toast.error('E-mail inválido');
    if (form.password.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres');
    const fullAddress = `${form.logradouro}, ${form.numero}${form.complemento ? ' - ' + form.complemento : ''} - ${form.bairro}, ${form.cidade}/${form.uf}`;
    try {
      await ensureIdentifierAvailable(form.cnpj, 'CNPJ');
    } catch (e: any) {
      return toast.error(e?.message || 'CNPJ já cadastrado.');
    }
    setLoading(true);
    const { data, error } = await signupCommon(form.email, form.password, {
      name: form.trade_name,
      role: 'lojista',
      cnpj: form.cnpj,
      trade_name: form.trade_name,
      company_name: form.razao_social,
      category: form.category,
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
      address: fullAddress,
      contact_email: form.email,
    });
    if (error) { toast.error(getSignupErrorMessage(error.message)); setLoading(false); return; }
    toast.success('Conta criada! Verifique seu e-mail para confirmar.');
    setLoading(false);
    navigate('/login');
  };

  return (
    <div>
      <BackBtn onBack={onBack} color="orange" />
      <h2 className="font-heading text-2xl font-black text-tikin-navy mb-6">CREDENCIAR ESTABELECIMENTO</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input placeholder="Nome Fantasia" required value={form.trade_name} onChange={e => set('trade_name', e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Razão Social" required value={form.razao_social} onChange={e => set('razao_social', e.target.value)} />
          <Input placeholder="CNPJ" required inputMode="numeric" value={form.cnpj} onChange={e => set('cnpj', maskCNPJ(e.target.value))} />
        </div>
        <Select value={form.category} onValueChange={v => set('category', v)}>
          <SelectTrigger><SelectValue placeholder="Categoria Principal (Regra de Uso)" /></SelectTrigger>
          <SelectContent>
            {cats.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder={cepLoading ? 'Buscando CEP...' : 'CEP'} required inputMode="numeric" value={form.cep} onChange={e => handleCepChange(e.target.value)} />
          <Input placeholder="Logradouro (Rua/Av.)" required className="md:col-span-2" value={form.logradouro} onChange={e => set('logradouro', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Número" required value={form.numero} onChange={e => set('numero', e.target.value)} />
          <Input placeholder="Complemento (opcional)" className="md:col-span-2" value={form.complemento} onChange={e => set('complemento', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="Bairro" required className="md:col-span-2" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
          <div className="relative">
            <Input
              placeholder="Cidade"
              required
              value={form.cidade}
              readOnly
              className="bg-[#F5F7FB] border-dashed border-tikin-navy/25 pr-9 text-tikin-navy/70 cursor-not-allowed"
            />
            <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/45 pointer-events-none" />
          </div>
          <div className="relative">
            <Input
              placeholder="UF"
              required
              maxLength={2}
              value={form.uf}
              readOnly
              className="bg-[#F5F7FB] border-dashed border-tikin-navy/25 pr-9 text-tikin-navy/70 cursor-not-allowed"
            />
            <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/45 pointer-events-none" />
          </div>
        </div>
        <p className="-mt-2 text-[11px] font-medium text-tikin-navy/55">Cidade e UF são preenchidos automaticamente a partir do CEP.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input type="email" placeholder="E-mail de Contato" required value={form.email} onChange={e => set('email', e.target.value)} />
          <Input type="password" placeholder="Criar Senha (mín. 6 caracteres)" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="bg-tikin-orange hover:bg-tikin-orange/90 text-white font-heading font-extrabold py-6 mt-2">
          {loading ? 'Criando...' : 'Finalizar Credenciamento'}
        </Button>
      </form>
    </div>
  );
}
