import { Home, Clock, User, QrCode, Wallet } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const navItems = {
  beneficiario: [
    { icon: Home, label: 'Home', path: '/beneficiario' },
    { icon: Clock, label: 'Histórico', path: '/beneficiario/historico' },
    { icon: User, label: 'Perfil', path: '/beneficiario/perfil' },
  ],
  lojista: [
    { icon: Home, label: 'Home', path: '/lojista' },
    { icon: QrCode, label: 'Receber', path: '/lojista/receber' },
    { icon: Wallet, label: 'Extrato', path: '/lojista/extrato' },
    { icon: User, label: 'Perfil', path: '/lojista/perfil' },
  ],
};

export function MobileNav() {
  const location = useLocation();
  const { activeRole } = useAuth();

  if (!activeRole || activeRole === 'emissor') return null;
  const items = navItems[activeRole] ?? [];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-elevated">
      <div className="flex items-center justify-around py-2">
        {items.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
