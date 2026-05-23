import { useAuth } from '@/lib/auth';
import { LogOut, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppHeader({ variant = 'light' }: { variant?: 'light' | 'navy' | 'orange' }) {
  const { profile, signOut, activeRole } = useAuth();
  const roleLabel = activeRole === 'emissor' ? 'Emissor' : activeRole === 'lojista' ? 'Lojista' : 'Beneficiário';

  const isDark = variant !== 'light';
  const logo = isDark ? '/logo-fundo-azul.webp' : '/logo-fundo-branco.webp';
  const bg = variant === 'navy' ? 'bg-tikin-navy' : variant === 'orange' ? 'bg-tikin-orange' : 'bg-white border-b border-tikin-navy/10';
  const textColor = isDark ? 'text-white' : 'text-tikin-navy';

  return (
    <header className={`sticky top-0 z-40 ${bg}`}>
      <div className="container-tikin flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="TIKIN" className="h-7" />
        </Link>
        <div className="flex items-center gap-4">
          <span className={`hidden sm:inline text-xs font-bold ${isDark ? 'text-white/70' : 'text-tikin-navy/60'}`}>
            {profile?.name} · {roleLabel}
          </span>
          <button onClick={signOut} className={`text-xs font-heading font-extrabold tracking-wider ${isDark ? 'text-white/70 hover:text-white' : 'text-tikin-navy/60 hover:text-tikin-navy'}`}>
            SAIR
          </button>
        </div>
      </div>
    </header>
  );
}
