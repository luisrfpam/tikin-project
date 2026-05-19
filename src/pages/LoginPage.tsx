import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { maskCPF, maskCNPJ, isValidCPF, isValidCNPJ, isValidEmail, onlyDigits, looksLikeDocument } from '@/lib/validators';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 3 * 60 * 1000;
const LS_KEY = 'tikin_login_attempts';

type AttemptRecord = { count: number; lockedUntil: number | null };

function readAttempts(key: string): AttemptRecord {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return all[key] || { count: 0, lockedUntil: null };
  } catch { return { count: 0, lockedUntil: null }; }
}
function writeAttempts(key: string, rec: AttemptRecord) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    all[key] = rec;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {}
}
function clearAttempts(key: string) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    delete all[key];
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {}
}
function fmtMs(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}


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
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();
  const cfg = ROLE_CONFIG[role];

  const attemptKey = `${role}:${identifier.trim().toLowerCase()}`;

  // Re-check lockout when identifier/role changes
  useEffect(() => {
    const rec = readAttempts(attemptKey);
    if (rec.lockedUntil && rec.lockedUntil > Date.now()) {
      setLockedUntil(rec.lockedUntil);
    } else {
      setLockedUntil(null);
      if (rec.lockedUntil && rec.lockedUntil <= Date.now()) clearAttempts(attemptKey);
    }
  }, [attemptKey]);

  // Tick countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        setLockedUntil(null);
        clearAttempts(attemptKey);
        clearInterval(t);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockedUntil, attemptKey]);


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

    // Block if locked
    const rec = readAttempts(attemptKey);
    if (rec.lockedUntil && rec.lockedUntil > Date.now()) {
      setLockedUntil(rec.lockedUntil);
      toast.error(`Muitas tentativas. Tente novamente em ${fmtMs(rec.lockedUntil - Date.now())}.`);
      return;
    }

    let email = value;
    if (!value.includes('@')) {
      const digits = onlyDigits(value);
      if (role === 'beneficiario' && digits.length !== 11) return toast.error('CPF deve ter 11 dígitos');
      if (role !== 'beneficiario' && digits.length !== 14) return toast.error('CNPJ deve ter 14 dígitos');
    } else if (!isValidEmail(value)) {
      return toast.error('E-mail inválido');
    }

    setLoading(true);
    if (!value.includes('@')) {
      const { data, error } = await supabase.rpc('lookup_email_by_identifier', { _identifier: onlyDigits(value) });
      if (error || !data) {
        setLoading(false);
        registerFailure();
        return;
      }
      email = data;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      registerFailure();
    } else {
      clearAttempts(attemptKey);
      navigate('/');
    }
  };

  const registerFailure = () => {
    const rec = readAttempts(attemptKey);
    const count = rec.count + 1;
    const remaining = MAX_ATTEMPTS - count;
    if (count >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_MS;
      writeAttempts(attemptKey, { count, lockedUntil: until });
      setLockedUntil(until);
      toast.error('Você excedeu o limite de tentativas. Aguarde 3 minutos antes de tentar novamente.');
    } else {
      writeAttempts(attemptKey, { count, lockedUntil: null });
      toast.error(`Credenciais inválidas. ${remaining} ${remaining === 1 ? 'tentativa restante' : 'tentativas restantes'}.`);
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


            {lockedUntil && lockedUntil > now && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong className="block font-heading">Acesso temporariamente bloqueado</strong>
                Por segurança, bloqueamos novas tentativas. Tente novamente em{' '}
                <span className="font-mono font-bold">{fmtMs(lockedUntil - now)}</span>.
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 text-tikin-navy/60 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-tikin-navy" /> Manter conectado
              </label>
              <Link to="/recuperar-senha" className="text-tikin-navy font-extrabold underline">Recuperar senha</Link>
            </div>

            <button
              type="submit"
              disabled={loading || (!!lockedUntil && lockedUntil > now)}
              className={`w-full py-4 rounded-xl font-heading font-extrabold tracking-wider text-sm transition disabled:opacity-60 disabled:cursor-not-allowed ${cfg.btnClass}`}
            >
              {lockedUntil && lockedUntil > now
                ? `AGUARDE ${fmtMs(lockedUntil - now)}`
                : loading ? 'ENTRANDO...' : 'ENTRAR NO APLICATIVO'}
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
