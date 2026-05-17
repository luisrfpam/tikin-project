import { useAuth } from '@/lib/auth';
import Landing from './site/Landing';
import RoleRouter from './RoleRouter';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <RoleRouter />;
  return <Landing />;
}
