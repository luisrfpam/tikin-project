import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Landing from './site/Landing';
import RoleRouter from './RoleRouter';

export default function Index() {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const hashType = (hashParams.get('type') || '').toLowerCase();
    const hasRecoveryTokens = Boolean(
      hashParams.get('access_token') &&
      hashParams.get('refresh_token') &&
      hashType === 'recovery'
    );
    if (hasRecoveryTokens) {
      navigate('/redefinir-senha' + window.location.search + window.location.hash, { replace: true });
    }
  }, [navigate]);

  if (loading) return null;
  if (session && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tikin-orange border-t-transparent" />
      </div>
    );
  }
  if (user) return <RoleRouter />;
  return <Landing />;
}
