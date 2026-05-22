import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ActivationState = 'loading' | 'success' | 'error';

function parseHashParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
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

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) throw setSessionError;
        } else {
          const code = new URLSearchParams(window.location.search).get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('Nao foi possivel validar sua sessao de ativacao. Solicite um novo link.');
        }

        const { data, error } = await supabase.rpc('activate_pending_signup');
        if (error) throw error;

        const activated = Boolean((data as any)?.activated);
        if (!activated) {
          throw new Error('Nao foi possivel ativar seu acesso por este link.');
        }

        await supabase.auth.signOut();
        setState('success');
        setMessage('Cadastro ativado com sucesso. Voce ja pode fazer login.');
        toast.success('Cadastro ativado! Faça login para continuar.');
        setTimeout(() => navigate('/login'), 1200);
      } catch (err: any) {
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
