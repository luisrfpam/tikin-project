import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function RedefinirSenha() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [activationChecked, setActivationChecked] = useState(false);
  const [canResetPassword, setCanResetPassword] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const hashType = (hashParams.get('type') || '').toLowerCase();

    if (accessToken && refreshToken && hashType === 'recovery') {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            toast.error('Link de recuperação inválido ou expirado. Solicite um novo.');
            navigate('/recuperar-senha', { replace: true });
          } else {
            // Remove tokens from URL without reloading
            history.replaceState(null, '', window.location.pathname);
            setSessionReady(true);
          }
        });
    } else {
      setSessionReady(true);
    }
  }, [navigate]);

  useEffect(() => {
    if (!sessionReady) return;

    let mounted = true;
    const verifyActivation = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (!mounted) return;

      if (userError || !user) {
        setCanResetPassword(false);
        setActivationMessage('Link inválido ou sessão expirada. Solicite um novo link de recuperação.');
        setActivationChecked(true);
        return;
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError || !rolesData?.length) {
        setCanResetPassword(false);
        setActivationMessage('Seu cadastro ainda não está ativo. Ative sua conta primeiro para redefinir a senha.');
        setActivationChecked(true);
        return;
      }

      const isEmissor = rolesData.some(r => r.role === 'emissor');
      if (isEmissor) {
        const { data: enabledData, error: enabledError } = await supabase.rpc('is_current_issuer_enabled');
        if (enabledError || !enabledData) {
          setCanResetPassword(false);
          setActivationMessage('Seu cadastro de emitente ainda não está ativo. Aguarde aprovação para redefinir a senha.');
          setActivationChecked(true);
          return;
        }
      }

      setCanResetPassword(true);
      setActivationMessage('');
      setActivationChecked(true);
    };

    void verifyActivation();

    return () => {
      mounted = false;
    };
  }, [sessionReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canResetPassword) {
      return toast.error('Seu cadastro ainda não está ativo. Ative sua conta primeiro para redefinir a senha.');
    }
    if (password.length < 6) return toast.error('Mínimo de 6 caracteres');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Senha redefinida com sucesso!');
    navigate('/login');
  };

  if (!sessionReady || !activationChecked) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tikin-orange border-t-transparent" />
      </div>
    );
  }

  if (!canResetPassword) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
        <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
          <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-elevated p-10 border-t-4 border-t-tikin-navy text-center">
            <h2 className="font-heading text-2xl font-black text-tikin-navy mb-2">CADASTRO AINDA NÃO ATIVO</h2>
            <p className="text-sm text-tikin-navy/70 mb-7">{activationMessage}</p>
            <Link
              to="/login"
              className="inline-block py-3 px-6 rounded-xl bg-tikin-navy text-white font-heading font-extrabold text-sm"
            >
              IR PARA LOGIN
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-elevated p-10 border-t-4 border-t-tikin-navy">
          <h2 className="font-heading text-2xl font-black text-tikin-navy mb-1 text-center">NOVA SENHA</h2>
          <p className="text-sm text-tikin-navy/60 text-center mb-7">Crie uma nova senha de acesso.</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              className="w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none focus:border-tikin-navy" />
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl bg-tikin-navy hover:bg-tikin-navy/90 text-white font-heading font-extrabold tracking-wider text-sm disabled:opacity-60">
              {loading ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
