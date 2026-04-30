import { useAuth } from '@/lib/auth';
import { Navigate } from 'react-router-dom';

export default function RoleRouter() {
  const { activeRole, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  switch (activeRole) {
    case 'beneficiario':
      return <Navigate to="/beneficiario" replace />;
    case 'lojista':
      return <Navigate to="/lojista" replace />;
    case 'emissor':
      return <Navigate to="/emissor" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}
