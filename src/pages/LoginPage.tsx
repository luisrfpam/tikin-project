import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { maskCPF, maskCNPJ, isValidCPF, isValidCNPJ, isValidEmail, onlyDigits, looksLikeDocument } from '@/lib/validators';
import { getCanonicalAppOrigin } from '@/lib/appUrl';
import { DOC_MESSAGES } from '@/lib/documentMessages';

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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();
  const cfg = ROLE_CONFIG[role];
  const errorClass = 'border-red-500 focus:border-red-500';

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);

    const hashType = (hashParams.get('type') || '').toLowerCase();
    const hasSignupTokens = Boolean(hashParams.get('access_token') && hashParams.get('refresh_token') && hashType === 'signup');
    const hasAuthCode = Boolean(queryParams.get('code'));

    if (hasSignupTokens || hasAuthCode) {
      navigate('/ativar-cadastro' + window.location.search + window.location.hash, { replace: true });
    }
  }, [navigate]);

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
  const trimmedIdentifier = identifier.trim();
  const identifierDigits = onlyDigits(trimmedIdentifier);
  const isEmailIdentifier = trimmedIdentifier.includes('@');
  const isIdentifierValid =
    trimmedIdentifier.length > 0 &&
    (isEmailIdentifier
      ? isValidEmail(trimmedIdentifier)
      : role === 'beneficiario'
        ? identifierDigits.length === 11 && isValidCPF(identifierDigits)
        : identifierDigits.length === 14 && isValidCNPJ(identifierDigits));
  const identifierErrorMessage = !trimmedIdentifier
    ? 'Informe seu identificador.'
    : isEmailIdentifier && !isValidEmail(trimmedIdentifier)
      ? 'E-mail inválido.'
      : role === 'beneficiario' && identifierDigits.length !== 11
        ? DOC_MESSAGES.cpfLength
        : role === 'beneficiario' && !isValidCPF(identifierDigits)
          ? DOC_MESSAGES.cpfInvalid
          : role !== 'beneficiario' && identifierDigits.length !== 14
            ? DOC_MESSAGES.cnpjLength
            : role !== 'beneficiario' && !isValidCNPJ(identifierDigits)
              ? DOC_MESSAGES.cnpjInvalid
              : null;

  const handleIdentifierChange = (raw: string) => {
    if (looksLikeDocument(raw) && !raw.includes('@')) {
      if (role === 'beneficiario') return setIdentifier(maskCPF(raw));
      return setIdentifier(maskCNPJ(raw));
    }
    setIdentifier(raw);
  };

  const isRpcSignatureMismatch = (error: any) => {
    const msg = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();
    return code === 'pgrst202' || msg.includes('function') || msg.includes('does not exist');
  };

  const lookupEmailByIdentifier = async (digits: string, expectedRole: Role, allowLooseFallback: boolean) => {
    const roleLookup = await supabase.rpc('lookup_email_by_identifier', {
      _identifier: digits,
      _expected_role: expectedRole,
    });

    if (!roleLookup.error && roleLookup.data) {
      return String(roleLookup.data);
    }

    const shouldTryLegacyLookup =
      isRpcSignatureMismatch(roleLookup.error) || (allowLooseFallback && !roleLookup.data);

    if (shouldTryLegacyLookup) {
      const legacyLookup = await supabase.rpc('lookup_email_by_identifier', {
        _identifier: digits,
      });
      if (!legacyLookup.error && legacyLookup.data) {
        return String(legacyLookup.data);
      }
      if (legacyLookup.error) throw legacyLookup.error;
    }

    if (roleLookup.error) throw roleLookup.error;
    return null;
  };

  const mapResendErrorMessage = (error: any) => {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('rate limit')) {
      return 'Aguarde alguns instantes antes de reenviar novamente.';
    }
    if (msg.includes('email')) {
      return 'Não foi possível reenviar para este e-mail agora. Confira o endereço e tente novamente.';
    }
    return error?.message || 'Não foi possível reenviar a ativação.';
  };

  const resendActivationViaEdgeFunction = async (email: string, emailRedirectTo: string) => {
    const { data, error } = await supabase.functions.invoke('resend-signup-activation', {
      body: { email, redirectTo: emailRedirectTo },
    });

    if (error) throw error;

    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload?.ok) return;
    if (payload?.error) throw new Error(payload.error);
    throw new Error('Não foi possível reenviar a ativação.');
  };

  const resendActivationViaRecoveryFallback = async (email: string, emailRedirectTo: string) => {
    const { data, error } = await supabase.functions.invoke('password-recovery-random', {
      body: { email, redirectTo: emailRedirectTo },
    });

    if (error) throw error;

    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload?.ok) return;
    if (payload?.error) throw new Error(payload.error);
    throw new Error('Não foi possível enviar um novo link de ativação.');
  };

  const resolveEmailFromIdentifier = async (value: string) => {
    if (value.includes('@')) {
      if (!isValidEmail(value)) {
        throw new Error('E-mail inválido');
      }
      return value;
    }

    const digits = onlyDigits(value);
    if (role === 'beneficiario' && digits.length !== 11) {
      throw new Error(DOC_MESSAGES.cpfLength);
    }
    if (role === 'beneficiario' && !isValidCPF(digits)) {
      throw new Error(DOC_MESSAGES.cpfInvalid);
    }
    if (role !== 'beneficiario' && digits.length !== 14) {
      throw new Error(DOC_MESSAGES.cnpjLength);
    }
    if (role !== 'beneficiario' && !isValidCNPJ(digits)) {
      throw new Error(DOC_MESSAGES.cnpjInvalid);
    }

    const data = await lookupEmailByIdentifier(digits, role, true);
    if (!data) {
      throw new Error(DOC_MESSAGES.identifierNotFoundForRole);
    }

    return data;
  };

  const handleResendActivation = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return toast.error('Informe seu identificador para reenviar a ativação');

    try {
      setResendLoading(true);
      const email = (await resolveEmailFromIdentifier(value)).toLowerCase();
      const emailRedirectTo = `${getCanonicalAppOrigin()}/ativar-cadastro`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo },
      });

      if (error) {
        const { error: fallbackError } = await supabase.auth.resend({
          type: 'signup',
          email,
        });
        if (fallbackError) {
          try {
            await resendActivationViaEdgeFunction(email, emailRedirectTo);
          } catch {
            await resendActivationViaRecoveryFallback(email, emailRedirectTo);
          }
        }
      }

      toast.success('Enviamos um novo e-mail de confirmação de cadastro.');
    } catch (err: any) {
      toast.error(mapResendErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const value = identifier.trim();
    if (!value) return toast.error('Informe seu identificador');
    if (!isIdentifierValid) return toast.error(identifierErrorMessage || 'Identificador inválido');
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
      if (role === 'beneficiario' && digits.length !== 11) return toast.error(DOC_MESSAGES.cpfLength);
      if (role === 'beneficiario' && !isValidCPF(digits)) return toast.error(DOC_MESSAGES.cpfInvalid);
      if (role !== 'beneficiario' && digits.length !== 14) return toast.error(DOC_MESSAGES.cnpjLength);
      if (role !== 'beneficiario' && !isValidCNPJ(digits)) return toast.error(DOC_MESSAGES.cnpjInvalid);
    } else if (!isValidEmail(value)) {
      return toast.error('E-mail inválido');
    }

    setLoading(true);
    try {
    // Evita conflito de sessão quando o usuário troca de perfil/conta no mesmo navegador.
    await supabase.auth.signOut();
    if (!value.includes('@')) {
      const data = await lookupEmailByIdentifier(onlyDigits(value), role, true);
      if (!data) {
        setLoading(false);
        toast.error(DOC_MESSAGES.identifierNotFoundForRole);
        return;
      }
      email = data;
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
        if (role === 'emissor') {
          toast.error('Seu acesso de emitente ainda não foi ativado pelo admin. Assim que aprovado, seu login será liberado.');
        } else {
          toast.error('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e spam.');
        }
        return;
      }
      registerFailure();
    } else {
      const userId = signInData.user?.id;
      if (role === 'beneficiario' || role === 'lojista') {
        let { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId || '');

        let hasActiveRole = !rolesError && Boolean(rolesData?.length);

        // Self-heal legacy accounts that are email-confirmed in auth but missing role bootstrap.
        if (!hasActiveRole) {
          const { data: activationData, error: activationError } = await (supabase as any)['rpc']('activate_pending_signup');
          if (!activationError && Boolean((activationData as any)?.activated)) {
            const retryRoles = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId || '');
            rolesData = retryRoles.data;
            rolesError = retryRoles.error;
            hasActiveRole = !rolesError && Boolean(rolesData?.length);
          }
        }

        if (!hasActiveRole) {
          await supabase.auth.signOut();
          toast.error('Seu cadastro ainda não está ativo. Aguarde a liberação ou solicite um novo link de ativação.');
          return;
        }
      }

      if (role === 'emissor') {
        const { data: issuerProfile } = await supabase
          .from('issuers')
          .select('id')
          .eq('user_id', userId || '')
          .maybeSingle();

        if (!issuerProfile) {
          await supabase.auth.signOut();
          toast.error(DOC_MESSAGES.identifierNotFoundForRole);
          return;
        }

        const { data: enabledData, error: enabledError } = await supabase.rpc('is_current_issuer_enabled');
        if (enabledError || !enabledData) {
          await supabase.auth.signOut();
          toast.error('Seu cadastro de emitente está em análise pela TIKiN. Aguarde a aprovação para acessar.');
          return;
        }
      }

      clearAttempts(attemptKey);
      navigate('/');
    }
    } catch (err: any) {
      setLoading(false);
      toast.error(err?.message || 'Erro ao tentar fazer login. Tente novamente.');
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
          <Link to="/"><img src="/logo-fundo-branco.webp" alt="TIKIN" className="h-7" /></Link>
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
            <img src="/logo-fundo-branco.webp" alt="TIKIN" className="h-9 mx-auto mb-5" />
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

          <form onSubmit={handleLogin} noValidate className="space-y-5">
            <div>
              <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">{cfg.fieldLabel}</label>
              <input
                type="text"
                required
                inputMode={isDoc ? 'numeric' : 'text'}
                value={identifier}
                onChange={e => handleIdentifierChange(e.target.value)}
                placeholder={cfg.placeholder}
                className={`w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none transition ${cfg.ringFocus} ${submitAttempted && !isIdentifierValid ? errorClass : ''}`}
              />
              {submitAttempted && !isIdentifierValid && (
                <p className="mt-1 text-[11px] font-medium text-red-600">{identifierErrorMessage}</p>
              )}
            </div>
            <div>
              <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">SENHA</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full px-4 py-3.5 pr-11 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none transition ${cfg.ringFocus} ${submitAttempted && !password ? errorClass : ''}`}
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
              {submitAttempted && !password && (
                <p className="mt-1 text-[11px] font-medium text-red-600">Informe sua senha.</p>
              )}
            </div>


            {lockedUntil && lockedUntil > now && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong className="block font-heading">Acesso temporariamente bloqueado</strong>
                Por segurança, bloqueamos novas tentativas. Tente novamente em{' '}
                <span className="font-mono font-bold">{fmtMs(lockedUntil - now)}</span>.
              </div>
            )}

            <div className="flex flex-wrap justify-end items-center gap-4 text-sm">
              {(role === 'beneficiario' || role === 'lojista') && (
                <button
                  type="button"
                  onClick={handleResendActivation}
                  disabled={resendLoading}
                  className="text-tikin-navy font-extrabold underline disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resendLoading ? 'Reenviando...' : 'Reenviar ativação'}
                </button>
              )}
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
