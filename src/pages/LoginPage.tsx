import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { maskCPF, maskCNPJ, isValidCPF, isValidCNPJ, isValidEmail, onlyDigits, looksLikeDocument } from '@/lib/validators';

type Role = 'beneficiario' | 'lojista' | 'emissor';

const ROLE_CONFIG: Record<Role, {
  label: string;
  fieldLabel: string;
  placeholder: string;
  accent: string;
  ringFocus: string;
  btnClass: string;
  borderTop: string;
}> = {
  beneficiario: {
    label: 'Beneficiário',
    fieldLabel: 'CPF OU E-MAIL',
    placeholder: 'CPF ou e-mail',
    accent: 'tikin-navy',
    ringFocus: 'focus:border-tikin-navy',
    btnClass: 'bg-tikin-navy hover:bg-tikin-navy/90 text-white',
    borderTop: 'border-t-tikin-navy',
  },
  lojista: {
    label: 'Lojista',
    fieldLabel: 'CNPJ OU E-MAIL',
    placeholder: 'CNPJ ou e-mail institucional',
    accent: 'tikin-orange',
    ringFocus: 'focus:border-tikin-orange',
    btnClass: 'bg-tikin-orange hover:bg-tikin-orange/90 text-white',
    borderTop: 'border-t-tikin-orange',
  },
  emissor: {
    label: 'Emitente',
    fieldLabel: 'CNPJ OU E-MAIL',
    placeholder: 'CNPJ ou e-mail corporativo',
    accent: 'tikin-navy',
    ringFocus: 'focus:border-tikin-navy',
    btnClass: 'bg-tikin-navy hover:bg-tikin-navy/90 text-white',
    borderTop: 'border-t-tikin-navy',
  },
};

export default function LoginPage() {
  const [role, setRole] = useState<Role>('beneficiario');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const cfg = ROLE_CONFIG[role];

  const isDoc = looksLikeDocument(identifier) && !identifier.includes('@');

  const handleIdentifierChange = (raw: string) => {
    if (looksLikeDocument(raw) && !raw.includes('@')) {
      if (role === 'beneficiario') return setIdentifier(maskCPF(raw));
      return setIdentifier(maskCNPJ(raw));
    }
    setIdentifier(raw);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return toast.error('Informe seu identificador');
    if (!password) return toast.error('Informe sua senha');

    let email = value;
    if (!value.includes('@')) {
      if (role === 'beneficiario' && !isValidCPF(value)) return toast.error('CPF inválido');
      if (role !== 'beneficiario' && !isValidCNPJ(value)) return toast.error('CNPJ inválido');
    } else if (!isValidEmail(value)) {
      return toast.error('E-mail inválido');
    }

    setLoading(true);
    if (!value.includes('@')) {
      const { data, error } = await supabase.rpc('lookup_email_by_identifier', { _identifier: onlyDigits(value) });
      if (error || !data) {
        setLoading(false);
        toast.error('Documento não encontrado. Verifique seus dados.');
        return;
      }
      email = data;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error('Credenciais inválidas');
    } else {
      navigate('/');
    }
  };

  const tabBtn = (r: Role) => {
    const active = role === r;
    const c = ROLE_CONFIG[r];
    if (!active) {
      return 'bg-transparent text-tikin-navy/50 border border-tikin-navy/10 hover:border-tikin-navy/30';
    }
    if (r === 'lojista') return 'bg-tikin-orange text-white border-2 border-tikin-orange font-extrabold';
    return 'bg-tikin-navy text-white border-2 border-tikin-navy font-extrabold';
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
          <Link to="/" className="text-tikin-navy/50 text-sm font-bold border-l border-tikin-navy/10 pl-4 hidden sm:inline">
            ← Voltar ao site
          </Link>
        </div>
        <Link to="/registro" className="text-tikin-navy text-sm font-extrabold hover:text-tikin-orange transition">
          Criar conta
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className={`w-full max-w-md bg-white rounded-3xl shadow-elevated p-10 border-t-4 ${cfg.borderTop}`}>
          <div className="text-center mb-8">
            <img src="/logo-fundo-branco.png" alt="TIKIN" className="h-9 mx-auto mb-5" />
            <h2 className="font-heading text-2xl font-black text-tikin-navy mb-1">ACESSO AO SISTEMA</h2>
            <p className="text-sm text-tikin-navy/60">Autentique-se para gerenciar seus ativos.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-7">
            {(['beneficiario', 'lojista', 'emissor'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-2.5 rounded-lg text-xs font-heading transition ${tabBtn(r)}`}
              >
                {ROLE_CONFIG[r].label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">{cfg.fieldLabel}</label>
              <input
                type="text"
                required
                inputMode={isDoc ? 'numeric' : 'text'}
                value={identifier}
                onChange={e => handleIdentifierChange(e.target.value)}
                placeholder={cfg.placeholder}
                className={`w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none transition ${cfg.ringFocus}`}
              />
            </div>
            <div>
              <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">SENHA</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none transition ${cfg.ringFocus}`}
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 text-tikin-navy/60 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-tikin-navy" /> Manter conectado
              </label>
              <Link to="/recuperar-senha" className="text-tikin-navy font-extrabold underline">Recuperar senha</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-heading font-extrabold tracking-wider text-sm transition disabled:opacity-60 ${cfg.btnClass}`}
            >
              {loading ? 'ENTRANDO...' : 'ENTRAR NO APLICATIVO'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-tikin-navy/60">
            Novo no ecossistema?{' '}
            <Link to="/solicitar-onboarding" className="text-tikin-navy font-extrabold hover:underline">
              Solicitar Onboarding
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
