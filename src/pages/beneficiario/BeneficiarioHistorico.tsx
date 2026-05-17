import { brl } from '@/lib/format';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { Store, Zap, AlertTriangle, Calendar, Search, X } from 'lucide-react';
import { useCategories, categoryLabel } from '@/lib/categories';
import { useVoucherStatuses, voucherStatusLabel, toneBadgeClass, voucherStatusTone } from '@/lib/voucherStatuses';
import { IssuerScopePicker, IssuerBadge, useIssuerScope } from '@/lib/issuerScope';

type Period = 5 | 10 | 15 | 30 | 'custom' | 'all';
type Tab = 'extrato' | 'vencer';
type SortKey = 'recent' | 'oldest' | 'value_desc' | 'value_asc';

interface Row {
  id: string;
  kind: 'credit' | 'debit';
  date: string;
  amount: number;
  category: string;
  establishment?: string;
  status?: string;
  issuer_id: string;
}

interface VoucherRow {
  id: string;
  value: number;
  remaining: number;
  category: string;
  status: string;
  expiration_date: string;
  created_at: string;
  issuer_id: string;
}

export default function BeneficiarioHistorico() {
  const { user } = useAuth();
  const cats = useCategories();
  const statuses = useVoucherStatuses();
  const scope = useIssuerScope();
  const [tab, setTab] = useState<Tab>('extrato');
  const [rows, setRows] = useState<Row[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [category, setCategory] = useState<string>('todos');
  const [period, setPeriod] = useState<Period>(30);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [vencerWindow, setVencerWindow] = useState<7 | 15 | 30 | 60>(30);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: vs } = await supabase
        .from('vouchers')
        .select('id, value, remaining_value, created_at, rules, beneficiary_id, status, expiration_date, issuer_id')
        .eq('beneficiary_id', user.id);
      const vouchersData = (vs as any[]) ?? [];
      const ids = vouchersData.map(v => v.id);

      setVouchers(vouchersData.map(v => ({
        id: v.id,
        value: Number(v.value),
        remaining: Number(v.remaining_value),
        category: (v.rules?.category as string) || 'geral',
        status: v.status,
        expiration_date: v.expiration_date,
        created_at: v.created_at,
        issuer_id: v.issuer_id,
      })));

      let txData: any[] = [];
      if (ids.length) {
        const { data: ts } = await supabase
          .from('transactions')
          .select('id, amount, status, created_at, voucher_id, establishment_id, establishments(name, category)')
          .in('voucher_id', ids)
          .order('created_at', { ascending: false });
        txData = ts ?? [];
      }

      const credits: Row[] = vouchersData.map(v => ({
        id: 'v-' + v.id,
        kind: 'credit',
        date: v.created_at,
        amount: Number(v.value),
        category: (v.rules?.category as string) || 'geral',
        establishment: 'Crédito de voucher',
        issuer_id: v.issuer_id,
      }));

      const debits: Row[] = txData.map(t => {
        const v = vouchersData.find(x => x.id === t.voucher_id);
        return {
          id: 't-' + t.id,
          kind: 'debit',
          date: t.created_at,
          amount: Number(t.amount),
          category: (v?.rules?.category as string) || 'geral',
          establishment: t.establishments?.name || 'Estabelecimento',
          status: t.status,
          issuer_id: v?.issuer_id,
        };
      });

      setRows([...credits, ...debits].sort((a, b) => +new Date(b.date) - +new Date(a.date)));
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let fromMs = 0, toMs = now;
    if (period === 'custom') {
      if (from) fromMs = +new Date(from);
      if (to) toMs = +new Date(to) + 86400000;
    } else if (period !== 'all') {
      fromMs = now - period * 86400000;
    }
    const min = minValue ? Number(minValue) : -Infinity;
    const max = maxValue ? Number(maxValue) : Infinity;
    const q = search.trim().toLowerCase();
    let res = rows.filter(r => {
      if (!scope.matches(r.issuer_id)) return false;
      const ms = +new Date(r.date);
      if (ms < fromMs || ms > toMs) return false;
      if (category !== 'todos' && r.category.toLowerCase() !== category) return false;
      if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
      if (r.amount < min || r.amount > max) return false;
      if (q && !(r.establishment ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
    res = [...res].sort((a, b) => {
      if (sort === 'recent') return +new Date(b.date) - +new Date(a.date);
      if (sort === 'oldest') return +new Date(a.date) - +new Date(b.date);
      if (sort === 'value_desc') return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return res;
  }, [rows, category, period, from, to, kindFilter, search, sort, minValue, maxValue, scope.selectedId]);

  const totals = useMemo(() => {
    let cred = 0, deb = 0;
    filtered.forEach(r => r.kind === 'credit' ? (cred += r.amount) : (deb += r.amount));
    return { cred, deb, balance: cred - deb };
  }, [filtered]);

  const categories = useMemo(() => {
    const set = new Set(rows.filter(r => scope.matches(r.issuer_id)).map(r => r.category));
    return ['todos', ...Array.from(set)];
  }, [rows, scope.selectedId]);

  // Vouchers a vencer
  const vencerList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return vouchers
      .filter(v => {
        if (!scope.matches(v.issuer_id)) return false;
        if (!['active', 'partially_used'].includes(v.status)) return false;
        if (v.remaining <= 0) return false;
        const exp = parseISO(v.expiration_date);
        const days = differenceInCalendarDays(exp, today);
        if (days < 0) return false;
        if (days > vencerWindow) return false;
        if (category !== 'todos' && v.category.toLowerCase() !== category) return false;
        return true;
      })
      .sort((a, b) => +parseISO(a.expiration_date) - +parseISO(b.expiration_date));
  }, [vouchers, vencerWindow, category, scope.selectedId]);

  const vencerTotal = vencerList.reduce((s, v) => s + v.remaining, 0);

  const clearFilters = () => {
    setCategory('todos');
    setPeriod(30);
    setFrom(''); setTo('');
    setKindFilter('all');
    setSearch('');
    setSort('recent');
    setMinValue(''); setMaxValue('');
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-28">
      <AppHeader variant="navy" />
      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        <h1 className="font-heading text-2xl font-black text-tikin-navy">Extrato</h1>

        <IssuerScopePicker />

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-1 grid grid-cols-2 shadow-card">
          <button
            onClick={() => setTab('extrato')}
            className={`py-2 rounded-xl text-xs font-bold ${tab === 'extrato' ? 'bg-tikin-navy text-white' : 'text-tikin-navy/60'}`}>
            Movimentações
          </button>
          <button
            onClick={() => setTab('vencer')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${tab === 'vencer' ? 'bg-tikin-orange text-white' : 'text-tikin-navy/60'}`}>
            <AlertTriangle size={12} /> A vencer
            {vencerList.length > 0 && tab !== 'vencer' && (
              <span className="ml-1 bg-tikin-orange text-white text-[9px] font-black rounded-full px-1.5 py-0.5">{vencerList.length}</span>
            )}
          </button>
        </div>

        {tab === 'extrato' && (
          <div className="bg-white rounded-2xl p-5 grid grid-cols-3 shadow-card text-center">
            <div>
              <p className="text-[10px] text-tikin-navy/40 font-bold">Saldo</p>
              <p className="font-heading font-black text-tikin-navy text-sm mt-1">R$ {brl(totals.balance)}</p>
            </div>
            <div className="border-x border-tikin-navy/5">
              <p className="text-[10px] text-tikin-navy/40 font-bold">Recebido</p>
              <p className="font-heading font-black text-success text-sm mt-1">+ R$ {brl(totals.cred)}</p>
            </div>
            <div>
              <p className="text-[10px] text-tikin-navy/40 font-bold">Gasto</p>
              <p className="font-heading font-black text-destructive text-sm mt-1">− R$ {brl(totals.deb)}</p>
            </div>
          </div>
        )}

        {tab === 'vencer' && (
          <div className="bg-tikin-orange/10 border border-tikin-orange/30 rounded-2xl p-5 text-center">
            <p className="text-[10px] text-tikin-navy/60 font-bold uppercase tracking-wider">Saldo a vencer em até {vencerWindow} dias</p>
            <p className="font-heading font-black text-tikin-orange text-2xl mt-1">R$ {brl(vencerTotal)}</p>
            <p className="text-[11px] text-tikin-navy/60 mt-1">{vencerList.length} voucher(s) próximos do vencimento</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-card space-y-4">
          {tab === 'extrato' && (
            <>
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tikin-navy/40" />
                <input
                  type="text"
                  placeholder="Buscar por estabelecimento"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-lg text-xs border border-tikin-navy/10 bg-[#F7F8FA]"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/40">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-tikin-navy/60 mb-2 font-heading uppercase tracking-wider">Tipo</p>
                <div className="flex gap-2">
                  {([['all','Todos'],['credit','Créditos'],['debit','Gastos']] as const).map(([k,l]) => (
                    <button key={k} onClick={() => setKindFilter(k)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold ${kindFilter===k?'bg-tikin-navy text-white':'bg-[#F7F8FA] text-tikin-navy/60'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-tikin-navy/60 mb-2 font-heading uppercase tracking-wider">Período</p>
                <div className="flex flex-wrap gap-2">
                  {([5,10,15,30] as Period[]).map(d => (
                    <button key={d} onClick={() => setPeriod(d)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold ${period===d?'bg-tikin-navy text-white':'bg-[#F7F8FA] text-tikin-navy/60'}`}>
                      {d} dias
                    </button>
                  ))}
                  <button onClick={() => setPeriod('all')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold ${period==='all'?'bg-tikin-navy text-white':'bg-[#F7F8FA] text-tikin-navy/60'}`}>
                    Tudo
                  </button>
                  <button onClick={() => setPeriod('custom')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold ${period==='custom'?'bg-tikin-navy text-white':'bg-[#F7F8FA] text-tikin-navy/60'}`}>
                    Período
                  </button>
                </div>
                {period === 'custom' && (
                  <div className="flex gap-2 mt-3">
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs border border-tikin-navy/10 bg-[#F7F8FA]" />
                    <input type="date" value={to} onChange={e => setTo(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs border border-tikin-navy/10 bg-[#F7F8FA]" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-tikin-navy/60 mb-2 font-heading uppercase tracking-wider">Valor (R$)</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Mínimo" value={minValue} onChange={e => setMinValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs border border-tikin-navy/10 bg-[#F7F8FA]" />
                  <input type="number" placeholder="Máximo" value={maxValue} onChange={e => setMaxValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs border border-tikin-navy/10 bg-[#F7F8FA]" />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-tikin-navy/60 mb-2 font-heading uppercase tracking-wider">Ordenar por</p>
                <div className="flex flex-wrap gap-2">
                  {([['recent','Mais recente'],['oldest','Mais antigo'],['value_desc','Maior valor'],['value_asc','Menor valor']] as const).map(([k,l]) => (
                    <button key={k} onClick={() => setSort(k)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold ${sort===k?'bg-tikin-navy text-white':'bg-[#F7F8FA] text-tikin-navy/60'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'vencer' && (
            <div>
              <p className="text-[11px] font-bold text-tikin-navy/60 mb-2 font-heading uppercase tracking-wider">Vencendo em até</p>
              <div className="flex gap-2">
                {([7,15,30,60] as const).map(d => (
                  <button key={d} onClick={() => setVencerWindow(d)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold ${vencerWindow===d?'bg-tikin-orange text-white':'bg-[#F7F8FA] text-tikin-navy/60'}`}>
                    {d} dias
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold text-tikin-navy/60 mb-2 font-heading uppercase tracking-wider">Tipo de voucher</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold ${category===c?'bg-tikin-orange text-white':'bg-[#F7F8FA] text-tikin-navy/60'}`}>
                  {c === 'todos' ? 'Todos' : categoryLabel(c, cats)}
                </button>
              ))}
            </div>
          </div>

          <button onClick={clearFilters}
            className="w-full py-2 rounded-lg text-xs font-bold text-tikin-navy/60 border border-tikin-navy/10 hover:bg-[#F7F8FA]">
            Limpar filtros
          </button>
        </div>

        {/* Lists */}
        {tab === 'extrato' && (
          <div className="bg-white rounded-2xl shadow-card divide-y divide-tikin-navy/5">
            {filtered.length === 0 && (
              <p className="p-8 text-center text-sm text-tikin-navy/50">Nenhuma movimentação no período.</p>
            )}
            {filtered.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    r.kind==='debit'?'bg-destructive/10 text-destructive':'bg-success/10 text-success'}`}>
                    {r.kind==='debit' ? <Store size={16} /> : <Zap size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-tikin-navy truncate">{r.establishment}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <IssuerBadge issuerId={r.issuer_id} />
                    </div>
                    <p className="text-[10px] text-tikin-navy/40 mt-0.5">
                      {categoryLabel(r.category, cats)} · {format(new Date(r.date), 'dd/MM/yyyy HH:mm')}
                      {r.status && r.status !== 'confirmed' ? ` · ${r.status}` : ''}
                    </p>
                  </div>
                </div>
                <span className={`font-heading font-black text-sm whitespace-nowrap ${
                  r.kind==='debit'?'text-destructive':'text-success'}`}>
                  {r.kind==='debit'?'−':'+'} R$ {brl(r.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'vencer' && (
          <div className="bg-white rounded-2xl shadow-card divide-y divide-tikin-navy/5">
            {vencerList.length === 0 && (
              <p className="p-8 text-center text-sm text-tikin-navy/50">Nenhum voucher vencendo nos próximos {vencerWindow} dias.</p>
            )}
            {vencerList.map(v => {
              const today = new Date(); today.setHours(0,0,0,0);
              const days = differenceInCalendarDays(parseISO(v.expiration_date), today);
              const urgent = days <= 7;
              return (
                <div key={v.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${urgent ? 'bg-destructive/10 text-destructive' : 'bg-tikin-orange/10 text-tikin-orange'}`}>
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-tikin-navy truncate">{categoryLabel(v.category, cats)}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <IssuerBadge issuerId={v.issuer_id} />
                      </div>
                      <p className="text-[10px] text-tikin-navy/40 mt-0.5">
                        Vence {format(parseISO(v.expiration_date), 'dd/MM/yyyy')} ·{' '}
                        <span className={urgent ? 'text-destructive font-bold' : 'text-tikin-orange font-bold'}>
                          {days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`}
                        </span>
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${toneBadgeClass(voucherStatusTone(v.status, statuses))}`}>
                        {voucherStatusLabel(v.status, statuses)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-black text-sm text-tikin-navy">R$ {brl(v.remaining)}</p>
                    {v.remaining !== v.value && (
                      <p className="text-[10px] text-tikin-navy/40">de R$ {brl(v.value)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
