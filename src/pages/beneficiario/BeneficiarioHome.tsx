import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MobileNav } from '@/components/layout/MobileNav';
import { QrCode, Map, Receipt, ChevronRight, LogOut, Bell, SlidersHorizontal, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { categoryLabel, useCategories } from '@/lib/categories';
import { voucherStatusLabel, voucherStatusTone, useVoucherStatuses } from '@/lib/voucherStatuses';
import { IssuerScopePicker, IssuerBadge, useIssuerScope } from '@/lib/issuerScope';

interface VoucherData {
  id: string;
  value: number;
  remaining_value: number;
  expiration_date: string;
  rules: Record<string, string>;
  status: string;
  issuer_id: string;
}

const PAGE_SIZE = 6;
type ExpiryWindow = 'all' | '30' | '60' | '90' | 'expired';

export default function BeneficiarioHome() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const scope = useIssuerScope();
  const categories = useCategories();
  const statuses = useVoucherStatuses();
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [fCategory, setFCategory] = useState<string>('all');
  const [fStatus, setFStatus] = useState<string>('all');
  const [fExpiry, setFExpiry] = useState<ExpiryWindow>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('vouchers').select('*').eq('beneficiary_id', user.id).then(({ data }) => {
      setVouchers((data as VoucherData[]) ?? []);
    });
  }, [user]);

  const scopedVouchers = vouchers.filter(v => scope.matches(v.issuer_id));
  const totalBalance = scopedVouchers.filter(v => v.status === 'active' || v.status === 'partially_used').reduce((s, v) => s + Number(v.remaining_value), 0);

  const filteredVouchers = useMemo(() => {
    const today = new Date();
    return scopedVouchers
      .filter(v => fCategory === 'all' || v.rules?.category === fCategory)
      .filter(v => fStatus === 'all' || v.status === fStatus)
      .filter(v => {
        if (fExpiry === 'all') return true;
        const days = differenceInDays(new Date(v.expiration_date), today);
        if (fExpiry === 'expired') return days < 0;
        return days >= 0 && days <= Number(fExpiry);
      })
      .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime());
  }, [scopedVouchers, fCategory, fStatus, fExpiry]);

  // Reset pagination when filters or scope change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [fCategory, fStatus, fExpiry, scope.selectedId]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(c => Math.min(c + PAGE_SIZE, filteredVouchers.length));
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filteredVouchers.length]);

  const visibleVouchers = filteredVouchers.slice(0, visibleCount);
  const activeFilters = [fCategory !== 'all', fStatus !== 'all', fExpiry !== 'all'].filter(Boolean).length;
  const clearFilters = () => { setFCategory('all'); setFStatus('all'); setFExpiry('all'); };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-28">
      {/* Navy Hero Header */}
      <div className="relative bg-tikin-navy pb-20 pt-5 px-6">
        <div className="flex items-center justify-between">
          <img src="/logo-fundo-azul.webp" alt="TIKIN" className="h-6" />
          <div className="flex items-center gap-3">
            <Bell className="text-white" size={20} />
            <button onClick={signOut} className="text-white/60 text-xs font-extrabold">SAIR</button>
          </div>
        </div>
        <div className="mt-6">
          <h1 className="font-heading text-3xl font-black text-white">
            Olá, {profile?.name?.split(' ')[0] || 'Beneficiário'}
          </h1>
          <p className="text-white/60 text-sm mt-1">Que bom te ver por aqui!</p>
        </div>
      </div>

      <div className="max-w-md mx-auto -mt-12 px-5 relative z-10 space-y-4">
        {/* Issuer scope picker */}
        <IssuerScopePicker />

        {/* Saldo card */}
        <div className="bg-white rounded-2xl p-6 shadow-elevated relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-50">
            <svg width="80" height="80" viewBox="0 0 80 80">
              {[
                [40, 0, 0.4], [60, 0, 0.6], [20, 20, 0.5], [40, 20, 0.8], [60, 20, 0.4],
                [0, 40, 0.3], [20, 40, 1], [40, 40, 0.5], [0, 60, 0.6], [20, 60, 0.4],
              ].map((c, i) => (
                <rect key={i} x={c[0]} y={c[1]} width="12" height="12" fill="hsl(var(--tikin-orange))" opacity={c[2]} />
              ))}
            </svg>
          </div>
          <p className="text-tikin-navy/60 font-semibold text-sm">
            Saldo disponível {scope.current ? `· ${scope.current.name}` : '· todos os emissores'}
          </p>
          <p className="font-heading text-4xl font-black text-tikin-navy mt-2">
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-tikin-orange" />
            <p className="text-xs text-tikin-navy/50">Atualizado agora</p>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={() => navigate('/beneficiario/pagar')}
          className="w-full flex items-center justify-center gap-3 bg-tikin-orange text-white py-5 rounded-2xl font-heading font-extrabold text-base shadow-orange"
        >
          <QrCode size={24} /> Pagar com QR Code
        </button>

        {/* Two action cards */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/beneficiario/historico')} className="bg-white rounded-2xl p-4 flex items-center gap-3 text-left">
            <Receipt className="text-tikin-navy" size={22} />
            <div className="flex-1">
              <p className="font-heading font-extrabold text-tikin-navy text-sm">Extrato</p>
              <p className="text-[10px] text-tikin-navy/50">Movimentações</p>
            </div>
            <ChevronRight className="text-tikin-navy/30" size={16} />
          </button>
          <button onClick={() => navigate('/beneficiario/onde-usar')} className="bg-white rounded-2xl p-4 flex items-center gap-3 text-left">
            <Map className="text-tikin-navy" size={22} />
            <div className="flex-1">
              <p className="font-heading font-extrabold text-tikin-navy text-sm">Onde usar</p>
              <p className="text-[10px] text-tikin-navy/50">Estabelecimentos</p>
            </div>
            <ChevronRight className="text-tikin-navy/30" size={16} />
          </button>
        </div>

        {/* Vouchers list */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-tikin-navy text-sm">Meus Vouchers</h2>
              <span className="text-xs text-tikin-orange font-bold">{filteredVouchers.length}{activeFilters > 0 && <span className="text-tikin-navy/30 font-semibold"> / {scopedVouchers.length}</span>}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition ${
                activeFilters > 0 || showFilters
                  ? 'bg-tikin-orange text-white border-tikin-orange'
                  : 'bg-white text-tikin-navy border-tikin-navy/10'
              }`}
            >
              <SlidersHorizontal size={12} />
              FILTROS{activeFilters > 0 && ` · ${activeFilters}`}
            </button>
          </div>

          {showFilters && (
            <div className="bg-white rounded-2xl p-4 shadow-card space-y-3 mb-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/50">Categoria</label>
                <select
                  value={fCategory}
                  onChange={e => setFCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-tikin-navy/10 text-sm font-bold text-tikin-navy bg-white"
                >
                  <option value="all">Todas</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/50">Status</label>
                <select
                  value={fStatus}
                  onChange={e => setFStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-tikin-navy/10 text-sm font-bold text-tikin-navy bg-white"
                >
                  <option value="all">Todos</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/50">Vencimento</label>
                <div className="grid grid-cols-5 gap-1.5 mt-1">
                  {([
                    ['all', 'Todos'],
                    ['30', '30d'],
                    ['60', '60d'],
                    ['90', '90d'],
                    ['expired', 'Vencidos'],
                  ] as [ExpiryWindow, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFExpiry(id)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-extrabold border ${
                        fExpiry === id ? 'bg-tikin-navy text-white border-tikin-navy' : 'bg-white text-tikin-navy/70 border-tikin-navy/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-extrabold text-tikin-navy/60 hover:text-tikin-orange"
                >
                  <X size={12} /> Limpar filtros
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {filteredVouchers.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center text-sm text-tikin-navy/50">
                {scopedVouchers.length === 0
                  ? `Nenhum voucher ${scope.current ? `de ${scope.current.name}` : 'ainda'}.`
                  : 'Nenhum voucher para os filtros selecionados.'}
              </div>
            )}
            {visibleVouchers.map(v => (
              <div key={v.id} className="bg-white rounded-2xl p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-heading font-extrabold text-tikin-navy">{categoryLabel(v.rules?.category) || 'Geral'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <IssuerBadge issuerId={v.issuer_id} />
                  </div>
                  <p className="text-xs text-tikin-navy/50 mt-1">
                    Válido até {format(new Date(v.expiration_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-heading font-black text-tikin-navy">
                    R$ {Number(v.remaining_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {(() => {
                    const tone = voucherStatusTone(v.status);
                    const cls = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-destructive' : tone === 'info' ? 'text-blue-500' : 'text-tikin-navy/40';
                    return (
                      <span className={`text-[10px] font-extrabold uppercase ${cls}`}>
                        {voucherStatusLabel(v.status)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
            {visibleCount < filteredVouchers.length && (
              <div ref={sentinelRef} className="py-4 text-center text-[11px] font-bold text-tikin-navy/40">
                Carregando mais…
              </div>
            )}
          </div>
        </div>

      </div>

      <MobileNav />
    </div>
  );
}
