import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { LayoutGrid, Users, Wallet, LogOut, Link2 } from 'lucide-react';
import { StellarBadge } from '@/components/StellarHashLink';

const items = [
  { to: '/emissor', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/emissor/beneficiarios', label: 'Beneficiários', icon: Users },
  { to: '/emissor/fundos', label: 'Fundos', icon: Wallet },
  { to: '/emissor/blockchain', label: 'Blockchain', icon: Link2 },
];

export function EmissorSidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-[#0A1122] border-r border-white/5 py-7">
      <div className="px-6 pb-8">
        <Link to="/emissor"><img src="/logo-fundo-azul.webp" alt="TIKIN" className="h-7" /></Link>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-heading font-bold transition ${
                isActive
                  ? 'bg-tikin-orange text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="mx-4 p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0D1B3D] to-[#162447]">
        <img src="/logo-fundo-azul.webp" alt="TIKIN" className="h-5 mb-3" />
        <p className="font-heading font-extrabold text-sm leading-snug">Transformamos benefícios em valor que retorna.</p>
        <p className="text-[10px] text-white/30 mt-1.5">Menos desperdício, mais impacto.</p>
      </div>
    </aside>
  );
}

export function EmissorTopbar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { signOut, profile } = useAuth();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-5 border-b border-white/5">
      <div>
        <h1 className="font-heading font-black text-lg">{title}</h1>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <NavLink to="/emissor/blockchain" className="hidden md:block"><StellarBadge /></NavLink>
        {right}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40 text-xs font-black">
            {(profile?.name || 'E')[0].toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-white/80">{profile?.name || 'Emitente'}</p>
            <p className="text-[10px] text-white/30">Emitente</p>
          </div>
        </div>
        <button onClick={signOut} className="text-white/40 hover:text-white text-xs font-heading font-extrabold flex items-center gap-1.5">
          <LogOut size={14} /> SAIR
        </button>
      </div>
    </header>
  );
}

export function EmissorLayout({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-tikin-navy text-white">
      <EmissorSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <EmissorTopbar title={title} subtitle={subtitle} right={right} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
