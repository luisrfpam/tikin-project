import { useAuth } from '@/lib/auth';
import { Navigate } from 'react-router-dom';

export default function RoleRouter() {
  const { activeRole, loading, user, roles } = useAuth();
  if (loading || (user && roles.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tikin-orange border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  switch (activeRole) {
    case 'beneficiario': return <Navigate to="/beneficiario" replace />;
    case 'lojista': return <Navigate to="/lojista" replace />;
    case 'emissor': return <Navigate to="/emissor" replace />;
    default: return <Navigate to="/login" replace />;
  }
}
