import { Home, Clock, User, QrCode, Wallet, Map } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const beneficiarioItems = [
  { icon: Home, label: 'Início', path: '/beneficiario' },
  { icon: Map, label: 'Onde Usar', path: '/beneficiario/onde-usar' },
  { icon: QrCode, label: 'Pagar', path: '/beneficiario/pagar', highlight: true },
  { icon: Clock, label: 'Extrato', path: '/beneficiario/historico' },
  { icon: User, label: 'Perfil', path: '/beneficiario/perfil' },
];

const lojistaItems = [
  { icon: Home, label: 'Início', path: '/lojista' },
  { icon: QrCode, label: 'Cobrar', path: '/lojista/receber', highlight: true },
  { icon: Wallet, label: 'Extrato', path: '/lojista/extrato' },
  { icon: User, label: 'Perfil', path: '/lojista/perfil' },
];

export function MobileNav() {
  const location = useLocation();
  const { activeRole } = useAuth();

  if (!activeRole || activeRole === 'emissor') return null;
  const items = activeRole === 'beneficiario' ? beneficiarioItems : lojistaItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-tikin-navy/5 shadow-elevated">
      <div className="mx-auto max-w-md flex items-center justify-around px-2 pt-2 pb-4">
        {items.map(({ icon: Icon, label, path, highlight }) => {
          const active = location.pathname === path;
          if (highlight) {
            return (
              <Link key={path + label} to={path} className="-translate-y-3 flex flex-col items-center">
                <div className="bg-tikin-orange rounded-2xl px-4 py-3 shadow-orange">
                  <Icon className="text-white" size={24} />
                </div>
                <span className="mt-1 text-[10px] font-heading font-extrabold text-tikin-orange">{label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={path + label}
              to={path}
              className={`flex flex-col items-center gap-1 px-3 py-1 ${active ? 'text-tikin-navy' : 'text-tikin-navy/30'}`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-heading font-bold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
