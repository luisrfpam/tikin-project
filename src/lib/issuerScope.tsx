import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ChevronDown, Building2, Check } from 'lucide-react';

export interface IssuerOption {
  id: string;
  name: string;
}

interface IssuerScopeCtx {
  issuers: IssuerOption[];
  selectedId: string; // 'all' or issuer id
  setSelectedId: (id: string) => void;
  current: IssuerOption | null; // null when 'all'
  loading: boolean;
  /** Returns true if the given voucher's issuer_id should be visible under the current scope. */
  matches: (issuerId: string | null | undefined) => boolean;
  nameOf: (issuerId: string | null | undefined) => string;
}

const Ctx = createContext<IssuerScopeCtx | null>(null);
const STORAGE_KEY = 'tikin.beneficiario.issuerScope';

export function IssuerScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [issuers, setIssuers] = useState<IssuerOption[]>([]);
  const [selectedId, setSelectedIdState] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'all'; } catch { return 'all'; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIssuers([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('issuer_beneficiaries')
        .select('issuer_id, issuers(id, company_name)')
        .eq('beneficiary_id', user.id);
      const list: IssuerOption[] = ((data as any[]) ?? [])
        .map(r => r.issuers ? { id: r.issuers.id, name: r.issuers.company_name } : null)
        .filter(Boolean) as IssuerOption[];
      // dedupe
      const seen = new Set<string>();
      const dedup = list.filter(i => seen.has(i.id) ? false : (seen.add(i.id), true));
      dedup.sort((a, b) => a.name.localeCompare(b.name));
      setIssuers(dedup);
      // Reset selection if no longer valid
      if (selectedId !== 'all' && !dedup.find(i => i.id === selectedId)) {
        setSelectedIdState('all');
        try { localStorage.setItem(STORAGE_KEY, 'all'); } catch {}
      }
      setLoading(false);
    })();
  }, [user]);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  };

  const value = useMemo<IssuerScopeCtx>(() => {
    const map = new Map(issuers.map(i => [i.id, i.name]));
    return {
      issuers,
      selectedId,
      setSelectedId,
      loading,
      current: selectedId === 'all' ? null : (issuers.find(i => i.id === selectedId) ?? null),
      matches: (issuerId) => selectedId === 'all' || issuerId === selectedId,
      nameOf: (issuerId) => (issuerId && map.get(issuerId)) || 'Emissor',
    };
  }, [issuers, selectedId, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIssuerScope() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useIssuerScope must be used inside IssuerScopeProvider');
  return ctx;
}

/** Chip-style selector to be placed at the top of beneficiary screens. */
export function IssuerScopePicker({ className = '' }: { className?: string }) {
  const { issuers, selectedId, setSelectedId, current } = useIssuerScope();
  const [open, setOpen] = useState(false);

  // Hide entirely if user has only one issuer (no choice to make)
  if (issuers.length <= 1) {
    if (issuers.length === 1) {
      return (
        <div className={`flex items-center gap-2 text-[11px] text-tikin-navy/60 ${className}`}>
          <Building2 size={12} className="text-tikin-orange" />
          <span className="font-bold">Emissor:</span>
          <span className="font-extrabold text-tikin-navy truncate">{issuers[0].name}</span>
        </div>
      );
    }
    return null;
  }

  const label = current?.name ?? 'Todos os emissores';

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-tikin-navy/10 shadow-card text-left"
      >
        <Building2 size={14} className="text-tikin-orange shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-wider font-bold text-tikin-navy/40 leading-none">Emissor</p>
          <p className="text-xs font-extrabold text-tikin-navy truncate mt-0.5">{label}</p>
        </div>
        <ChevronDown size={14} className={`text-tikin-navy/40 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-tikin-navy/10 rounded-xl shadow-elevated overflow-hidden">
            <button
              type="button"
              onClick={() => { setSelectedId('all'); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-left hover:bg-[#F7F8FA] ${
                selectedId === 'all' ? 'text-tikin-orange' : 'text-tikin-navy'
              }`}
            >
              <span>Todos os emissores</span>
              {selectedId === 'all' && <Check size={14} />}
            </button>
            <div className="h-px bg-tikin-navy/5" />
            {issuers.map(i => (
              <button
                key={i.id}
                type="button"
                onClick={() => { setSelectedId(i.id); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-left hover:bg-[#F7F8FA] ${
                  selectedId === i.id ? 'text-tikin-orange' : 'text-tikin-navy'
                }`}
              >
                <span className="truncate">{i.name}</span>
                {selectedId === i.id && <Check size={14} className="shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Small inline badge to show issuer origin on a voucher/transaction row. */
export function IssuerBadge({ issuerId, className = '' }: { issuerId: string | null | undefined; className?: string }) {
  const { nameOf } = useIssuerScope();
  if (!issuerId) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-tikin-navy/5 text-tikin-navy/70 ${className}`}>
      <Building2 size={9} className="text-tikin-orange" />
      {nameOf(issuerId)}
    </span>
  );
}
