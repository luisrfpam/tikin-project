import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PENDING_ROLE_GRACE_MS = 4000;

export default function RoleRouter() {
  const { activeRole, loading, user, roles, signOut } = useAuth();
  const [pendingRoleSince, setPendingRoleSince] = useState<number | null>(null);
  const [issuerEnabled, setIssuerEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || activeRole !== 'emissor') {
      setIssuerEnabled(null);
      return;
    }

    let mounted = true;
    (async () => {
      const { data } = await supabase.rpc('is_current_issuer_enabled');
      if (mounted) setIssuerEnabled(Boolean(data));
    })();

    return () => {
      mounted = false;
    };
  }, [user, activeRole]);

  useEffect(() => {
    if (user && roles.length === 0) {
      setPendingRoleSince(prev => prev ?? Date.now());
      return;
    }
    setPendingRoleSince(null);
  }, [user, roles.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tikin-orange border-t-transparent" />
      </div>
    );
  }

  if (user && roles.length === 0) {
    const shouldShowPendingCard = pendingRoleSince !== null && (Date.now() - pendingRoleSince) >= PENDING_ROLE_GRACE_MS;

    if (!shouldShowPendingCard) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-tikin-orange border-t-transparent" />
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-tikin-navy/10 bg-white p-6 text-center shadow-sm">
          <h1 className="font-heading text-xl font-black text-tikin-navy">Cadastro em processamento</h1>
          <p className="mt-2 text-sm text-tikin-navy/70">
            Seu acesso ainda não possui perfil ativo. Faça login novamente em alguns instantes.
          </p>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="mt-4 rounded-lg bg-tikin-navy px-4 py-2 text-sm font-extrabold text-white hover:bg-tikin-navy/90"
          >
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (activeRole === 'emissor' && issuerEnabled === false) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-tikin-navy/10 bg-white p-6 text-center shadow-sm">
          <h1 className="font-heading text-xl font-black text-tikin-navy">Cadastro de emitente em análise</h1>
          <p className="mt-2 text-sm text-tikin-navy/70">
            Seu acesso ainda não foi habilitado pela equipe TIKiN.
          </p>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="mt-4 rounded-lg bg-tikin-navy px-4 py-2 text-sm font-extrabold text-white hover:bg-tikin-navy/90"
          >
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  if (activeRole === 'emissor' && issuerEnabled === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tikin-orange border-t-transparent" />
      </div>
    );
  }

  switch (activeRole) {
    case 'beneficiario': return <Navigate to="/beneficiario" replace />;
    case 'lojista': return <Navigate to="/lojista" replace />;
    case 'emissor': return <Navigate to="/emissor" replace />;
    default: return <Navigate to="/login" replace />;
  }
}
