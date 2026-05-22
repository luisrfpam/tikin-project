import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Landing from './site/Landing';
import RoleRouter from './RoleRouter';

export default function Index() {
  const { user, loading } = useAuth();
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
  if (user) return <RoleRouter />;
  return <Landing />;
}
