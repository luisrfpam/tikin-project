import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ActivationState = 'loading' | 'success' | 'error';
const ACTIVATION_TIMEOUT_MS = 15000;

function parseHashParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise
      .then(result => {
        window.clearTimeout(timer);
        resolve(result);
      })
      .catch(err => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export default function AtivarCadastro() {
  const [state, setState] = useState<ActivationState>('loading');
  const [message, setMessage] = useState('Validando link de ativacao...');
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const hashParams = parseHashParams();
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const code = new URLSearchParams(window.location.search).get('code');

        if (!(accessToken && refreshToken) && !code) {
          throw new Error('Link de ativacao invalido ou expirado. Solicite um novo link.');
        }

        // Garante sessão única local antes de ativar outro usuário.
        await supabase.auth.signOut();

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await withTimeout(supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }), ACTIVATION_TIMEOUT_MS, 'Tempo esgotado ao validar sessao de ativacao.');
          if (setSessionError) throw setSessionError;
        } else {
          if (code) {
            const { error: exchangeError } = await withTimeout(
              supabase.auth.exchangeCodeForSession(code),
              ACTIVATION_TIMEOUT_MS,
              'Tempo esgotado ao validar codigo de ativacao.'
            );
            if (exchangeError) throw exchangeError;
          }
        }

        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          ACTIVATION_TIMEOUT_MS,
          'Tempo esgotado ao confirmar sessao de ativacao.'
        );
        if (!session?.user) {
          throw new Error('Nao foi possivel validar sua sessao de ativacao. Solicite um novo link.');
        }

        const { data, error } = await withTimeout(
          supabase.rpc('activate_pending_signup'),
          ACTIVATION_TIMEOUT_MS,
          'Tempo esgotado ao ativar cadastro. Tente novamente em instantes.'
        );
        if (error) throw error;

        const activated = Boolean((data as any)?.activated);
        if (!activated) {
          throw new Error('Nao foi possivel ativar seu acesso por este link.');
        }

        await supabase.auth.signOut();
        setState('success');
        setMessage('Cadastro ativado com sucesso. Voce ja pode fazer login.');
        toast.success('Cadastro ativado! Faça login para continuar.');
        window.history.replaceState({}, document.title, '/ativar-cadastro');
        setTimeout(() => navigate('/login'), 1200);
      } catch (err: any) {
        void supabase.auth.signOut();
        setState('error');
        setMessage(err?.message || 'Falha ao ativar cadastro. Solicite um novo link.');
      }
    };

    void run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-elevated p-10 border-t-4 border-t-tikin-navy text-center">
          {state === 'loading' && (
            <>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-tikin-orange border-t-transparent" />
              <h2 className="font-heading text-2xl font-black text-tikin-navy mt-5">ATIVANDO CADASTRO</h2>
            </>
          )}

          {state === 'success' && (
            <h2 className="font-heading text-2xl font-black text-tikin-navy">CADASTRO ATIVADO</h2>
          )}

          {state === 'error' && (
            <h2 className="font-heading text-2xl font-black text-tikin-navy">FALHA NA ATIVACAO</h2>
          )}

          <p className="text-sm text-tikin-navy/70 mt-3">{message}</p>

          {state !== 'loading' && (
            <Link
              to="/login"
              className="inline-block mt-6 py-3 px-6 rounded-xl bg-tikin-navy text-white font-heading font-extrabold text-sm"
            >
              IR PARA LOGIN
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
