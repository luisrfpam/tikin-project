import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { LogOut, Plus, TrendingUp, Users, Store, Zap, AlertTriangle, Clock, Filter, Loader2, Shield } from 'lucide-react';
import { format, subDays, parseISO, differenceInDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, ComposedChart, Line,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categoryLabel, useCategories } from '@/lib/categories';
import { useVoucherStatuses, voucherStatusLabel, voucherStatusTone, toneBadgeClass, type VoucherStatus } from '@/lib/voucherStatuses';
import { toast } from 'sonner';
import { mockBlockchainMint, addAuditLog } from '@/lib/supabase-helpers';
import { registerOnStellar } from '@/lib/stellar';
import { EmissorLayout } from './EmissorLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { maskCpf } from '@/lib/utils';

interface Voucher {
  id: string; beneficiary_cpf: string; beneficiary_id: string | null;
  value: number; remaining_value: number; expiration_date: string;
  status: string; rules: any; quantumcert_asset_id: string | null;
  created_at: string; issuer_id: string;
}
interface Tx {
  id: string; amount: number; created_at: string; voucher_category: string | null;
  beneficiary_name: string | null; tx_type: string; status: string;
  establishment_id: string; voucher_id: string;
}
interface Est { id: string; name: string; trade_name: string | null; category?: string | null; }
interface IssuerData { id: string; company_name: string; fund_balance: number; }
interface Fund { id: string; month: string; monthly_budget: number; allocated: number; }

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CATEGORY_COLORS = ['#FF7A00', '#4A90D9', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#f97316'];
const PERIODS = [
  { l: '7 dias', v: 7 }, { l: '15 dias', v: 15 }, { l: '30 dias', v: 30 },
  { l: '90 dias', v: 90 }, { l: '12 meses', v: 365 },
];

export default function EmissorDashboard() {
  const { user, signOut, profile } = useAuth();
  const [issuer, setIssuer] = useState<IssuerData | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [ests, setEsts] = useState<Est[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [activeBenefsCount, setActiveBenefsCount] = useState(0);
  const [activeBenefs, setActiveBenefs] = useState<{ id: string; name: string; cpf_masked: string }[]>([]);
  const [detailOpen, setDetailOpen] = useState<null | 'distribuido' | 'utilizado' | 'beneficiarios' | 'restante' | 'vencendo' | 'baixouso'>(null);
  const [lojistaDetail, setLojistaDetail] = useState<null | { id: string; name: string }>(null);
  const [txPage, setTxPage] = useState(0);
  const [lojistaPage, setLojistaPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodDays, setPeriodDays] = useState(30);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const voucherStatuses = useVoucherStatuses();
  const cats = useCategories();
  const [topN, setTopN] = useState<3 | 5 | 10>(5);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Emit form
  const [showForm, setShowForm] = useState(false);
  const [cpf, setCpf] = useState(''); const [value, setValue] = useState('');
  const [expDate, setExpDate] = useState(''); const [category, setCategory] = useState('alimentacao');
  const [emitting, setEmitting] = useState(false);

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const { data: iss } = await supabase.from('issuers').select('*').eq('user_id', user.id).maybeSingle();
    if (!iss) { setLoading(false); return; }
    setIssuer(iss as IssuerData);

    const [{ data: vs }, { data: ts }, { data: es }, { data: fs }] = await Promise.all([
      supabase.from('vouchers').select('*').eq('issuer_id', iss.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*, vouchers!inner(issuer_id)').eq('vouchers.issuer_id', iss.id).eq('status', 'confirmed').order('created_at', { ascending: false }).limit(500),
      supabase.from('establishments').select('id,name,trade_name,category'),
      supabase.from('issuer_funds').select('id,month,monthly_budget,allocated').eq('issuer_id', iss.id).order('month', { ascending: true }),
    ]);
    setVouchers((vs as Voucher[]) || []);
    setTxs((ts as any[] as Tx[]) || []);
    setEsts((es as Est[]) || []);
    setFunds((fs as Fund[]) || []);

    // Beneficiários ativos vinculados ao emitente (fonte: issuer_beneficiaries)
    const { data: bens } = await supabase.rpc('get_issuer_beneficiaries', { _issuer_id: iss.id });
    const benefList = ((bens as any[]) || []).filter(b => b.status === 'active');
    setActiveBenefsCount(benefList.length);
    setActiveBenefs(benefList.map(b => ({ id: b.id, name: b.name, cpf_masked: b.cpf_masked })));

    setLoading(false);
  };

  // ===== Computed =====
  const startDate = useMemo(() => {
    if (customStart) return new Date(customStart);
    return subDays(new Date(), periodDays);
  }, [periodDays, customStart]);
  const endDate = useMemo(() => customEnd ? new Date(customEnd) : new Date(), [customEnd]);

  const categoryOf = (v: { rules?: any }) => v.rules?.category || 'outros';

  const filteredVouchers = useMemo(() => vouchers.filter(v => {
    const created = parseISO(v.created_at);
    if (created < startDate || created > endDate) return false;
    if (categoryFilter !== 'all' && categoryOf(v) !== categoryFilter) return false;
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    return true;
  }), [vouchers, startDate, endDate, categoryFilter, statusFilter]);

  const filteredTxs = useMemo(() => txs.filter(t => {
    const d = parseISO(t.created_at);
    if (d < startDate || d > endDate) return false;
    if (t.status !== 'confirmed') return false;
    if (categoryFilter !== 'all' && t.voucher_category !== categoryFilter) return false;
    return true;
  }), [txs, startDate, endDate, categoryFilter]);

  // Categories list for filter
  const allCategories = useMemo(() => {
    const s = new Set<string>();
    vouchers.forEach(v => s.add(categoryOf(v)));
    return Array.from(s);
  }, [vouchers]);

  // KPIs
  // Distribuído: soma dos vouchers EMITIDOS na janela (com filtros)
  const saldoDistribuido = filteredVouchers.reduce((s, v) => s + Number(v.value), 0);
  // Utilizado: consumo REAL dos beneficiários na janela (transações), líquido de estornos
  const saldoUtilizado = filteredTxs.reduce((s, t) => {
    const amt = Number(t.amount);
    return s + (t.tx_type === 'credit' ? amt : -amt);
  }, 0);
  // Restante: estoque parado de TODOS os vouchers ativos/parciais do emitente (não filtrado pela janela de criação)
  const saldoRestante = vouchers
    .filter(v => v.status === 'active' || v.status === 'partially_used')
    .reduce((s, v) => s + Number(v.remaining_value), 0);
  // Beneficiários ativos: vínculo emitente↔beneficiário (issuer_beneficiaries)
  const beneficiariosAtivos = activeBenefsCount;
  const taxaUso = saldoDistribuido > 0 ? (saldoUtilizado / saldoDistribuido) * 100 : 0;

  // Janela dinâmica baseada nos filtros (período ou intervalo customizado)
  const janelaDias = useMemo(() => {
    if (customStart && customEnd) return Math.max(1, differenceInDays(endDate, startDate));
    return periodDays;
  }, [customStart, customEnd, startDate, endDate, periodDays]);

  const janelaLabel = useMemo(() => {
    if (customStart && customEnd) return `${format(startDate, 'dd/MM')} – ${format(endDate, 'dd/MM')}`;
    return `${janelaDias} dias`;
  }, [customStart, customEnd, startDate, endDate, janelaDias]);

  // Vouchers a vencer dentro da janela filtrada (respeita categoria/status)
  const vencendo = filteredVouchers.filter(v => {
    if (v.status !== 'active' && v.status !== 'partially_used') return false;
    const dias = differenceInDays(parseISO(v.expiration_date), new Date());
    return dias >= 0 && dias <= janelaDias;
  });
  const valorVencendo = vencendo.reduce((s, v) => s + Number(v.remaining_value), 0);

  // Baixo uso: ativos no período filtrado com <10% usado e idade >= metade da janela
  const idadeMinima = Math.max(7, Math.floor(janelaDias / 2));
  const baixoUso = filteredVouchers.filter(v => {
    if (v.status === 'used' || v.status === 'expired' || v.status === 'cancelled') return false;
    const diasVida = differenceInDays(new Date(), parseISO(v.created_at));
    if (diasVida < idadeMinima) return false;
    const usado = (Number(v.value) - Number(v.remaining_value)) / Number(v.value);
    return usado < 0.1;
  });

  // Categorias com saldo parado (top N) — respeita filtros de período/categoria/status
  const categoriasParadas = useMemo(() => {
    const map = new Map<string, { distribuido: number; parado: number }>();
    filteredVouchers.forEach(v => {
      const c = categoryOf(v);
      const cur = map.get(c) || { distribuido: 0, parado: 0 };
      cur.distribuido += Number(v.value);
      if (v.status === 'active' || v.status === 'partially_used') {
        cur.parado += Number(v.remaining_value);
      }
      map.set(c, cur);
    });
    return Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v, pct: v.distribuido ? (v.parado / v.distribuido) * 100 : 0 }))
      .sort((a, b) => b.parado - a.parado)
      .slice(0, topN);
  }, [filteredVouchers, topN]);

  // Uso por categoria (donut) - filtrado
  const usoPorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    filteredTxs.filter(t => t.tx_type === 'credit').forEach(t => {
      const c = t.voucher_category || 'outros';
      map.set(c, (map.get(c) || 0) + Number(t.amount));
    });
    if (map.size === 0) {
      filteredVouchers.forEach(v => {
        const c = categoryOf(v);
        const usado = Number(v.value) - Number(v.remaining_value);
        if (usado > 0) map.set(c, (map.get(c) || 0) + usado);
      });
    }
    const arr = Array.from(map.entries()).map(([id, value], i) => ({ name: categoryLabel(id, cats), value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
    return arr.sort((a, b) => b.value - a.value);
  }, [filteredTxs, filteredVouchers, cats]);

  // Orçamento (fundos) x Distribuído x Utilizado — sempre agregado por mês
  const fundExecution = useMemo(() => {
    const months: { label: string; key: string; date: Date }[] = [];
    const cur = startOfMonth(startDate);
    const last = startOfMonth(endDate);
    const guard = new Date(cur);
    while (guard <= last) {
      months.push({ label: format(guard, "MMM/yy", { locale: ptBR }), key: format(guard, 'yyyy-MM'), date: new Date(guard) });
      guard.setMonth(guard.getMonth() + 1);
    }
    const fundByMonth = new Map(funds.map(f => [format(parseISO(f.month), 'yyyy-MM'), f]));
    return months.map(m => {
      const dist = filteredVouchers
        .filter(v => format(parseISO(v.created_at), 'yyyy-MM') === m.key)
        .reduce((s, v) => s + Number(v.value), 0);
      const usado = filteredTxs
        .filter(t => t.tx_type === 'credit' && format(parseISO(t.created_at), 'yyyy-MM') === m.key)
        .reduce((s, t) => s + Number(t.amount), 0);
      const f = fundByMonth.get(m.key);
      return {
        mes: m.label,
        Orçamento: Math.round(Number(f?.monthly_budget || 0)),
        Distribuído: Math.round(dist),
        Utilizado: Math.round(usado),
      };
    });
  }, [filteredVouchers, filteredTxs, funds, startDate, endDate]);

  const currentMonthFund = useMemo(() => {
    const key = format(new Date(), 'yyyy-MM');
    const f = funds.find(x => format(parseISO(x.month), 'yyyy-MM') === key);
    const budget = Number(f?.monthly_budget || 0);
    const allocated = Number(f?.allocated || 0);
    const available = Math.max(0, budget - allocated);
    const pct = budget > 0 ? (allocated / budget) * 100 : 0;
    return { budget, allocated, available, pct, hasFund: !!f };
  }, [funds]);

  const fundTotals = useMemo(() => {
    const orc = fundExecution.reduce((s, r) => s + r.Orçamento, 0);
    const dist = fundExecution.reduce((s, r) => s + r.Distribuído, 0);
    const used = fundExecution.reduce((s, r) => s + r.Utilizado, 0);
    return {
      orc, dist, used,
      pctDist: orc > 0 ? (dist / orc) * 100 : 0,
      pctUsed: dist > 0 ? (used / dist) * 100 : 0,
      pctUsedOrc: orc > 0 ? (used / orc) * 100 : 0,
    };
  }, [fundExecution]);

  // Ranking de lojistas por volume recebido (todos os lojistas com transações no período)
  const lojistasRanking = useMemo(() => {
    const map = new Map<string, { total: number; count: number; beneficiarios: Set<string>; categorias: Set<string> }>();
    filteredTxs.filter(t => t.tx_type === 'credit').forEach(t => {
      const cur = map.get(t.establishment_id) || { total: 0, count: 0, beneficiarios: new Set<string>(), categorias: new Set<string>() };
      cur.total += Number(t.amount);
      cur.count += 1;
      if (t.beneficiary_name) cur.beneficiarios.add(t.beneficiary_name);
      if (t.voucher_category) cur.categorias.add(t.voucher_category);
      map.set(t.establishment_id, cur);
    });
    return Array.from(map.entries())
      .map(([id, v]) => {
        const e = ests.find(x => x.id === id);
        return {
          id,
          name: e?.trade_name || e?.name || 'Lojista',
          total: v.total,
          count: v.count,
          beneficiariosCount: v.beneficiarios.size,
          categorias: Array.from(v.categorias),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredTxs, ests]);

  const transacoesRecentes = filteredTxs;

  const handleEmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer) return;
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return toast.error('Valor inválido');
    if (val > issuer.fund_balance) return toast.error('Saldo insuficiente no Fundo');
    setEmitting(true);
    const { data: bp } = await supabase.from('profiles').select('id').eq('cpf', cpf).maybeSingle();
    const { data: voucher, error } = await supabase.from('vouchers').insert([{
      issuer_id: issuer.id, beneficiary_id: bp?.id ?? null, beneficiary_cpf: cpf,
      value: val, remaining_value: val, expiration_date: expDate,
      rules: { category }, status: 'active' as const,
    }]).select().single();
    if (error || !voucher) { toast.error('Erro ao emitir'); setEmitting(false); return; }
    const qc = await mockBlockchainMint(voucher.id);
    await supabase.from('vouchers').update({ quantumcert_asset_id: qc.blockchain_asset_id }).eq('id', voucher.id);
    await supabase.from('issuers').update({ fund_balance: issuer.fund_balance - val }).eq('id', issuer.id);
    await addAuditLog('voucher_issued', 'voucher', voucher.id, { value: val, cpf });
    const r = await registerOnStellar({ internal_id: voucher.id, entity_type: 'voucher', operation: 'create_voucher', amount: val, issuer_id: issuer.id });
    if (r.success && r.hash) toast.success(`Voucher emitido e registrado na Stellar (${r.hash.slice(0, 8)}…)`);
    else toast.success('Voucher emitido');
    setShowForm(false); setCpf(''); setValue(''); setExpDate('');
    setEmitting(false); loadAll();
  };

  if (loading) return <div className="min-h-screen bg-tikin-navy flex items-center justify-center"><Loader2 className="text-tikin-orange animate-spin" /></div>;

  return (
    <EmissorLayout
      title={`Olá, ${profile?.name?.split(' ')[0] || 'Admin'}`}
      subtitle={issuer?.company_name || 'Painel do emitente'}
      right={
        <Link to="/emissor/fundos" className="text-right block group" title="Ir para Gestão de Fundos">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold group-hover:text-white/60 transition">
            Disponível no mês
          </p>
          <p className={`font-heading font-black ${
            currentMonthFund.pct >= 90 ? 'text-red-400'
            : currentMonthFund.pct >= 70 ? 'text-amber-400'
            : 'text-tikin-orange'
          }`}>
            R$ {fmt(currentMonthFund.available)}
          </p>
          <p className="text-[10px] text-white/40 mt-0.5">
            {currentMonthFund.hasFund
              ? <>de R$ {fmt(currentMonthFund.budget)} · {currentMonthFund.pct.toFixed(0)}% usado</>
              : <>orçamento do mês não configurado</>}
          </p>
        </Link>
      }
    >
      <div className="p-4 sm:p-8 space-y-5">
        {/* FILTERS BAR */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-end gap-3">
          <Filter className="text-tikin-orange mb-2" size={18} />
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/40">Período</Label>
            <div className="flex gap-1 mt-1">
              {PERIODS.map(p => (
                <button key={p.v} onClick={() => { setPeriodDays(p.v); setCustomStart(''); setCustomEnd(''); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${periodDays === p.v && !customStart ? 'bg-tikin-orange text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                  {p.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/40">De</Label>
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8 w-36 bg-white/5 border-white/10 text-white text-xs" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/40">Até</Label>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8 w-36 bg-white/5 border-white/10 text-white text-xs" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/40">Categoria</Label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="h-8 rounded-md bg-[#0A1530] border border-white/10 px-2 text-xs text-white mt-1">
              <option value="all" className="bg-[#0A1530] text-white">Todas</option>
              {cats.map(c => <option key={c.id} value={c.id} className="bg-[#0A1530] text-white">{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/40">Status</Label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="h-8 rounded-md bg-[#0A1530] border border-white/10 px-2 text-xs text-white mt-1">
              <option value="all" className="bg-[#0A1530] text-white">Todos</option>
              {voucherStatuses.map(s => (
                <option key={s.id} value={s.id} className="bg-[#0A1530] text-white">{s.label}</option>
              ))}
            </select>
          </div>
        </div>



        {/* KPI ROW */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Saldo distribuído"
            value={`R$ ${fmt(saldoDistribuido)}`}
            sub={fundTotals.orc > 0
              ? `${filteredVouchers.length} vouchers · ${fundTotals.pctDist.toFixed(1)}% do orçamento`
              : `${filteredVouchers.length} vouchers no período`}
            icon={<TrendingUp size={18} />}
            onClick={() => setDetailOpen('distribuido')}
          />
          <KpiCard label="Saldo utilizado" value={`R$ ${fmt(saldoUtilizado)}`} sub={`${taxaUso.toFixed(1)}% do distribuído · ${filteredTxs.filter(t => t.tx_type === 'credit').length} transações`} icon={<Zap size={18} />} accent onClick={() => setDetailOpen('utilizado')} />
          <KpiCard label="Beneficiários ativos" value={beneficiariosAtivos.toLocaleString('pt-BR')} sub="vínculo ativo com o emitente" icon={<Users size={18} />} onClick={() => setDetailOpen('beneficiarios')} />
          <KpiCard label="Saldo restante" value={`R$ ${fmt(saldoRestante)}`} sub="em vouchers ativos/parciais" icon={<Shield size={18} />} onClick={() => setDetailOpen('restante')} />
        </div>

        {/* ALERTS */}
        <div className="grid gap-4 lg:grid-cols-3">
          <button type="button" onClick={() => setDetailOpen('vencendo')}
            className="bg-tikin-orange/10 border border-tikin-orange/30 rounded-2xl p-5 hover:bg-tikin-orange/15 transition group block text-left w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-tikin-orange" />
                <p className="text-[11px] font-heading font-bold uppercase tracking-widest text-tikin-orange">Vouchers a vencer ({janelaLabel})</p>
              </div>
              <span className="text-[10px] text-tikin-orange/60 group-hover:text-tikin-orange">ver →</span>
            </div>
            <p className="font-heading font-black text-2xl text-tikin-orange">{vencendo.length}</p>
            <p className="text-xs text-white/50 mt-1">R$ {fmt(valorVencendo)} em risco</p>
          </button>

          <button type="button" onClick={() => setDetailOpen('baixouso')}
            className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 hover:bg-red-500/10 transition group block text-left w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                <p className="text-[11px] font-heading font-bold uppercase tracking-widest text-red-400">Vouchers com baixo uso</p>
              </div>
              <span className="text-[10px] text-red-400/60 group-hover:text-red-400">ver →</span>
            </div>
            <p className="font-heading font-black text-2xl text-red-400">{baixoUso.length}</p>
            <p className="text-xs text-white/50 mt-1">&lt; 10% usado após {idadeMinima} dias</p>
          </button>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-heading font-bold uppercase tracking-widest text-white/50">Top categorias com saldo parado</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {([3, 5, 10] as const).map(n => (
                    <button key={n} onClick={() => setTopN(n)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${topN === n ? 'bg-tikin-orange text-white' : 'bg-white/5 text-white/50'}`}>{n}</button>
                  ))}
                </div>
                <Link to="/emissor/fundos" className="text-[10px] font-bold text-tikin-orange hover:underline">fundos →</Link>
              </div>
            </div>
            {categoriasParadas.length === 0 && <p className="text-xs text-white/40">Sem dados</p>}
            {categoriasParadas.map(c => (
              <div key={c.cat} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{categoryLabel(c.cat, cats)}</span>
                  <span className="text-white/50 font-bold">R$ {fmt(c.parado)}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-white/30 rounded-full" style={{ width: `${Math.min(c.pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="font-heading font-extrabold text-sm mb-4">Uso por categoria</p>
            {usoPorCategoria.length === 0 ? (
              <p className="text-xs text-white/40 py-12 text-center">Sem transações no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={usoPorCategoria} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {usoPorCategoria.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ outline: 'none', zIndex: 50 }}
                    contentStyle={{ background: '#0A1530', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12, padding: '8px 12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                    formatter={(v: number) => [`R$ ${fmt(v)}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-heading font-extrabold text-sm">Execução do orçamento ({janelaLabel})</p>
                <p className="text-[11px] text-white/40 mt-0.5">Orçamento mensal × vouchers distribuídos × valor utilizado pelos beneficiários</p>
              </div>
              <Link to="/emissor/fundos" className="text-[11px] font-bold text-tikin-orange hover:underline whitespace-nowrap">Gerir fundos →</Link>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Orçamento</p>
                <p className="font-heading font-black text-base mt-1">R$ {fmt(fundTotals.orc)}</p>
              </div>
              <div className="bg-tikin-orange/5 border border-tikin-orange/20 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-tikin-orange/80 font-bold">Distribuído</p>
                <p className="font-heading font-black text-base mt-1 text-tikin-orange">R$ {fmt(fundTotals.dist)}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{fundTotals.pctDist.toFixed(1)}% do orçamento</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-blue-300/80 font-bold">Utilizado</p>
                <p className="font-heading font-black text-base mt-1 text-blue-400">R$ {fmt(fundTotals.used)}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{fundTotals.pctUsed.toFixed(1)}% do distribuído</p>
              </div>
            </div>

            {fundExecution.length === 0 ? (
              <p className="text-xs text-white/40 py-12 text-center">Sem dados de fundos no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={fundExecution}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: '#0A1530', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => `R$ ${fmt(v)}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Distribuído" fill="#FF7A00" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Utilizado" fill="#4A90D9" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Orçamento" stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* TABLES */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-baseline justify-between mb-4">
              <p className="font-heading font-extrabold text-sm">Transações recentes</p>
              <p className="text-[10px] text-white/40">{transacoesRecentes.length} no período</p>
            </div>
            {transacoesRecentes.length === 0 ? (
              <p className="text-xs text-white/40">Nenhuma transação no período</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-white/40 uppercase">
                        <th className="pb-3 font-bold">Data</th>
                        <th className="pb-3 font-bold">Beneficiário</th>
                        <th className="pb-3 font-bold">Lojista</th>
                        <th className="pb-3 font-bold">Categoria</th>
                        <th className="pb-3 font-bold text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacoesRecentes.slice(txPage * PAGE_SIZE, (txPage + 1) * PAGE_SIZE).map(t => {
                        const e = ests.find(x => x.id === t.establishment_id);
                        return (
                          <tr key={t.id} className="border-b border-white/5 last:border-0">
                            <td className="py-3 text-white/70">{format(parseISO(t.created_at), 'dd/MM HH:mm')}</td>
                            <td className="py-3 text-white/80">{t.beneficiary_name || '—'}</td>
                            <td className="py-3 text-white/80">{e?.trade_name || e?.name || '—'}</td>
                            <td className="py-3"><span className="px-2 py-0.5 rounded bg-tikin-orange/10 text-tikin-orange">{categoryLabel(t.voucher_category)}</span></td>
                            <td className={`py-3 text-right font-bold ${t.tx_type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                              {t.tx_type === 'credit' ? '+' : '-'} R$ {fmt(Number(t.amount))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination page={txPage} setPage={setTxPage} total={transacoesRecentes.length} />
              </>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="mb-4">
              <p className="font-heading font-extrabold text-sm flex items-center gap-2"><Store size={14} /> Lojistas mais utilizados</p>
              <p className="text-[10px] text-white/40 mt-1">Volume recebido por cada lojista no período. Clique para ver o detalhamento.</p>
            </div>
            {lojistasRanking.length === 0 ? (
              <p className="text-xs text-white/40">Sem dados no período</p>
            ) : (
              <>
                {lojistasRanking.slice(lojistaPage * PAGE_SIZE, (lojistaPage + 1) * PAGE_SIZE).map((l, idx) => {
                  const i = lojistaPage * PAGE_SIZE + idx;
                  return (
                    <button key={l.id} onClick={() => setLojistaDetail({ id: l.id, name: l.name })}
                      className="w-full flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 text-left hover:bg-white/[0.03] -mx-2 px-2 rounded-md transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          i === 0 ? 'bg-tikin-orange text-white' : 'bg-tikin-orange/10 text-tikin-orange'
                        }`}>{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-xs text-white/85 truncate font-bold">{l.name}</p>
                          <p className="text-[10px] text-white/40">{l.count} transações · {l.beneficiariosCount} beneficiário{l.beneficiariosCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-bold text-white/90">R$ {fmt(l.total)}</p>
                        <p className="text-[10px] text-tikin-orange/80">ver →</p>
                      </div>
                    </button>
                  );
                })}
                <Pagination page={lojistaPage} setPage={setLojistaPage} total={lojistasRanking.length} />
              </>
            )}
          </div>
        </div>

      </div>

      <KpiDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(null)}
        janelaLabel={janelaLabel}
        saldoDistribuido={saldoDistribuido}
        saldoUtilizado={saldoUtilizado}
        saldoRestante={saldoRestante}
        beneficiariosAtivos={beneficiariosAtivos}
        valorVencendo={valorVencendo}
        idadeMinima={idadeMinima}
        filteredVouchers={filteredVouchers}
        filteredTxs={filteredTxs}
        vouchers={vouchers}
        vencendo={vencendo}
        baixoUso={baixoUso}
        ests={ests}
        activeBenefs={activeBenefs}
        cats={cats}
        voucherStatuses={voucherStatuses}
      />

      <LojistaDetailDialog
        lojista={lojistaDetail}
        onClose={() => setLojistaDetail(null)}
        janelaLabel={janelaLabel}
        filteredTxs={filteredTxs}
        ests={ests}
        cats={cats}
      />
    </EmissorLayout>
  );
}

const PAGE_SIZE = 15;

function Pagination({ page, setPage, total }: { page: number; setPage: (n: number) => void; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  return (
    <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-[11px] text-white/50">
      <span>Mostrando {from}–{to} de {total}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed font-bold">‹ Anterior</button>
        <span className="text-white/70 font-bold">{page + 1} / {pages}</span>
        <button onClick={() => setPage(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1}
          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed font-bold">Próxima ›</button>
      </div>
    </div>
  );
}

function StatusBadge({ status, list }: { status: string; list: VoucherStatus[] }) {
  const label = voucherStatusLabel(status, list);
  const tone = voucherStatusTone(status, list);
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${toneBadgeClass(tone)}`}>{label}</span>;
}

function KpiDetailDialog({
  open, onClose, janelaLabel,
  saldoDistribuido, saldoUtilizado, saldoRestante, beneficiariosAtivos,
  valorVencendo, idadeMinima,
  filteredVouchers, filteredTxs, vouchers, vencendo, baixoUso, ests, activeBenefs, cats, voucherStatuses,
}: {
  open: null | 'distribuido' | 'utilizado' | 'beneficiarios' | 'restante' | 'vencendo' | 'baixouso';
  onClose: () => void;
  janelaLabel: string;
  saldoDistribuido: number; saldoUtilizado: number; saldoRestante: number; beneficiariosAtivos: number;
  valorVencendo: number; idadeMinima: number;
  filteredVouchers: Voucher[]; filteredTxs: Tx[]; vouchers: Voucher[];
  vencendo: Voucher[]; baixoUso: Voucher[];
  ests: Est[];
  activeBenefs: { id: string; name: string; cpf_masked: string }[];
  cats: any[];
  voucherStatuses: VoucherStatus[];
}) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [open]);

  const title = open === 'distribuido' ? 'Saldo distribuído'
    : open === 'utilizado' ? 'Saldo utilizado'
    : open === 'beneficiarios' ? 'Beneficiários ativos'
    : open === 'restante' ? 'Saldo restante'
    : open === 'vencendo' ? `Vouchers a vencer (${janelaLabel})`
    : open === 'baixouso' ? 'Vouchers com baixo uso'
    : '';
  const subtitle = open === 'distribuido' ? `Vouchers emitidos no período (${janelaLabel}) — total R$ ${fmt(saldoDistribuido)}`
    : open === 'utilizado' ? `Transações reais dos beneficiários no período (${janelaLabel}) — total R$ ${fmt(saldoUtilizado)}`
    : open === 'beneficiarios' ? `Vínculos ativos do emitente — total ${beneficiariosAtivos}`
    : open === 'restante' ? `Saldo remanescente em vouchers ativos/parciais — total R$ ${fmt(saldoRestante)}`
    : open === 'vencendo' ? `Vouchers ativos/parciais cuja expiração ocorre nos próximos ${janelaLabel} — R$ ${fmt(valorVencendo)} em risco`
    : open === 'baixouso' ? `Vouchers com menos de 10% utilizado após ${idadeMinima} dias de emissão — total ${baixoUso.length}`
    : '';

  const restantes = vouchers.filter(v => v.status === 'active' || v.status === 'partially_used');
  const categoryOf = (v: { rules?: any }) => v.rules?.category || 'outros';

  const list: any[] =
    open === 'distribuido' ? filteredVouchers
    : open === 'utilizado' ? filteredTxs
    : open === 'beneficiarios' ? activeBenefs
    : open === 'restante' ? restantes
    : open === 'vencendo' ? vencendo
    : open === 'baixouso' ? baixoUso
    : [];
  const pageItems = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Dialog open={!!open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#0A1530] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          <DialogDescription className="text-white/50 text-xs">{subtitle}</DialogDescription>
        </DialogHeader>

        {open === 'distribuido' && (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10 text-left text-white/40 uppercase">
              <th className="pb-2 font-bold">Data</th><th className="pb-2 font-bold">CPF</th>
              <th className="pb-2 font-bold">Categoria</th><th className="pb-2 font-bold">Status</th>
              <th className="pb-2 font-bold text-right">Valor</th>
            </tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="py-4 text-white/40 text-center">Sem vouchers no período</td></tr>}
              {pageItems.map((v: Voucher) => (
                <tr key={v.id} className="border-b border-white/5">
                  <td className="py-2 text-white/70">{format(parseISO(v.created_at), 'dd/MM HH:mm')}</td>
                  <td className="py-2 text-white/80">{maskCpf(v.beneficiary_cpf)}</td>
                  <td className="py-2 text-white/80">{categoryLabel(categoryOf(v), cats)}</td>
                  <td className="py-2"><StatusBadge status={v.status} list={voucherStatuses} /></td>
                  <td className="py-2 text-right font-bold text-tikin-orange">R$ {fmt(Number(v.value))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {open === 'utilizado' && (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10 text-left text-white/40 uppercase">
              <th className="pb-2 font-bold">Data</th><th className="pb-2 font-bold">Beneficiário</th>
              <th className="pb-2 font-bold">Lojista</th><th className="pb-2 font-bold">Categoria</th>
              <th className="pb-2 font-bold">Tipo</th><th className="pb-2 font-bold text-right">Valor</th>
            </tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="py-4 text-white/40 text-center">Sem transações no período</td></tr>}
              {pageItems.map((t: Tx) => {
                const e = ests.find(x => x.id === t.establishment_id);
                return (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-2 text-white/70">{format(parseISO(t.created_at), 'dd/MM HH:mm')}</td>
                    <td className="py-2 text-white/80">{t.beneficiary_name || '—'}</td>
                    <td className="py-2 text-white/80">{e?.trade_name || e?.name || '—'}</td>
                    <td className="py-2 text-white/60">{categoryLabel(t.voucher_category, cats)}</td>
                    <td className="py-2 text-white/60">{t.tx_type === 'credit' ? 'Crédito' : 'Estorno'}</td>
                    <td className={`py-2 text-right font-bold ${t.tx_type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.tx_type === 'credit' ? '+' : '-'} R$ {fmt(Number(t.amount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {open === 'beneficiarios' && (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10 text-left text-white/40 uppercase">
              <th className="pb-2 font-bold">Nome</th><th className="pb-2 font-bold">CPF</th>
            </tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={2} className="py-4 text-white/40 text-center">Nenhum beneficiário ativo</td></tr>}
              {pageItems.map((b: { id: string; name: string; cpf_masked: string }) => (
                <tr key={b.id} className="border-b border-white/5">
                  <td className="py-2 text-white/80">{b.name}</td>
                  <td className="py-2 text-white/60">{b.cpf_masked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {open === 'restante' && (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10 text-left text-white/40 uppercase">
              <th className="pb-2 font-bold">Emitido em</th><th className="pb-2 font-bold">CPF</th>
              <th className="pb-2 font-bold">Categoria</th><th className="pb-2 font-bold">Vence</th>
              <th className="pb-2 font-bold">Status</th><th className="pb-2 font-bold text-right">Restante</th>
            </tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="py-4 text-white/40 text-center">Sem saldo restante</td></tr>}
              {pageItems.map((v: Voucher) => (
                <tr key={v.id} className="border-b border-white/5">
                  <td className="py-2 text-white/70">{format(parseISO(v.created_at), 'dd/MM/yy')}</td>
                  <td className="py-2 text-white/80">{maskCpf(v.beneficiary_cpf)}</td>
                  <td className="py-2 text-white/80">{categoryLabel(categoryOf(v), cats)}</td>
                  <td className="py-2 text-white/60">{format(parseISO(v.expiration_date), 'dd/MM/yy')}</td>
                  <td className="py-2"><StatusBadge status={v.status} list={voucherStatuses} /></td>
                  <td className="py-2 text-right font-bold">R$ {fmt(Number(v.remaining_value))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(open === 'vencendo' || open === 'baixouso') && (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10 text-left text-white/40 uppercase">
              <th className="pb-2 font-bold">Emitido em</th><th className="pb-2 font-bold">CPF</th>
              <th className="pb-2 font-bold">Categoria</th><th className="pb-2 font-bold">Vence</th>
              <th className="pb-2 font-bold">Status</th>
              <th className="pb-2 font-bold text-right">{open === 'vencendo' ? 'Restante' : '% usado'}</th>
            </tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="py-4 text-white/40 text-center">
                {open === 'vencendo' ? 'Nenhum voucher a vencer no período' : 'Nenhum voucher com baixo uso'}
              </td></tr>}
              {pageItems.map((v: Voucher) => {
                const usadoPct = Number(v.value) > 0
                  ? ((Number(v.value) - Number(v.remaining_value)) / Number(v.value)) * 100
                  : 0;
                return (
                  <tr key={v.id} className="border-b border-white/5">
                    <td className="py-2 text-white/70">{format(parseISO(v.created_at), 'dd/MM/yy')}</td>
                    <td className="py-2 text-white/80">{maskCpf(v.beneficiary_cpf)}</td>
                    <td className="py-2 text-white/80">{categoryLabel(categoryOf(v), cats)}</td>
                    <td className="py-2 text-white/60">{format(parseISO(v.expiration_date), 'dd/MM/yy')}</td>
                    <td className="py-2"><StatusBadge status={v.status} list={voucherStatuses} /></td>
                    <td className="py-2 text-right font-bold">
                      {open === 'vencendo'
                        ? <span className="text-tikin-orange">R$ {fmt(Number(v.remaining_value))}</span>
                        : <span className="text-red-400">{usadoPct.toFixed(1)}%</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination page={page} setPage={setPage} total={list.length} />
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({ label, value, sub, icon, accent, onClick }: { label: string; value: string; sub: string; icon: React.ReactNode; accent?: boolean; onClick?: () => void }) {
  const base = `rounded-2xl p-5 border text-left w-full ${accent ? 'bg-tikin-orange/10 border-tikin-orange/30' : 'bg-white/5 border-white/10'} ${onClick ? 'hover:bg-white/10 hover:border-white/20 transition cursor-pointer group' : ''}`;
  const content = (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-heading font-bold uppercase tracking-widest text-white/40">{label}</p>
        <span className={accent ? 'text-tikin-orange' : 'text-white/40'}>{icon}</span>
      </div>
      <p className={`font-heading font-black text-xl ${accent ? 'text-tikin-orange' : ''}`}>{value}</p>
      <p className="text-[10px] text-white/40 mt-1">{sub}</p>
      {onClick && (
        <p className={`text-[10px] font-bold mt-2 ${accent ? 'text-tikin-orange' : 'text-tikin-orange/70 group-hover:text-tikin-orange'}`}>
          Ver detalhes →
        </p>
      )}
    </>
  );
  if (onClick) return <button type="button" onClick={onClick} className={base}>{content}</button>;
  return <div className={base}>{content}</div>;
}

function LojistaDetailDialog({
  lojista, onClose, janelaLabel, filteredTxs, ests, cats,
}: {
  lojista: { id: string; name: string } | null;
  onClose: () => void;
  janelaLabel: string;
  filteredTxs: Tx[];
  ests: Est[];
  cats: any[];
}) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [lojista]);

  const est = lojista ? ests.find(e => e.id === lojista.id) : null;
  const txs = useMemo(() => lojista
    ? filteredTxs.filter(t => t.establishment_id === lojista.id && t.tx_type === 'credit')
        .sort((a, b) => +parseISO(b.created_at) - +parseISO(a.created_at))
    : [], [lojista, filteredTxs]);

  const total = txs.reduce((s, t) => s + Number(t.amount), 0);
  const ticketMedio = txs.length > 0 ? total / txs.length : 0;
  const beneficiariosUnicos = new Set(txs.map(t => t.beneficiary_name).filter(Boolean)).size;

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    txs.forEach(t => {
      const c = t.voucher_category || 'outros';
      m.set(c, (m.get(c) || 0) + Number(t.amount));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [txs]);

  const pageItems = txs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Dialog open={!!lojista} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#0A1530] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Store size={18} className="text-tikin-orange" /> {lojista?.name}</DialogTitle>
          <DialogDescription className="text-white/50 text-xs">
            Detalhamento do volume recebido no período ({janelaLabel}).
            {est?.category && <> · Categoria principal: <span className="text-white/70">{categoryLabel(est.category, cats)}</span></>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Total recebido</p>
            <p className="font-heading font-black text-lg mt-1 text-tikin-orange">R$ {fmt(total)}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Transações</p>
            <p className="font-heading font-black text-lg mt-1">{txs.length}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Ticket médio</p>
            <p className="font-heading font-black text-lg mt-1">R$ {fmt(ticketMedio)}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Beneficiários</p>
            <p className="font-heading font-black text-lg mt-1">{beneficiariosUnicos}</p>
          </div>
        </div>

        {porCategoria.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-2">Por categoria</p>
            <div className="flex flex-wrap gap-2">
              {porCategoria.map(([c, v]) => (
                <span key={c} className="px-3 py-1 rounded-full bg-tikin-orange/10 text-tikin-orange text-[11px] font-bold">
                  {categoryLabel(c, cats)} · R$ {fmt(v)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-2">Transações</p>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10 text-left text-white/40 uppercase">
              <th className="pb-2 font-bold">Data</th>
              <th className="pb-2 font-bold">Beneficiário</th>
              <th className="pb-2 font-bold">Categoria</th>
              <th className="pb-2 font-bold text-right">Valor</th>
            </tr></thead>
            <tbody>
              {txs.length === 0 && <tr><td colSpan={4} className="py-4 text-white/40 text-center">Nenhuma transação no período</td></tr>}
              {pageItems.map(t => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="py-2 text-white/70">{format(parseISO(t.created_at), 'dd/MM HH:mm')}</td>
                  <td className="py-2 text-white/80">{t.beneficiary_name || '—'}</td>
                  <td className="py-2 text-white/60">{categoryLabel(t.voucher_category, cats)}</td>
                  <td className="py-2 text-right font-bold text-green-400">+ R$ {fmt(Number(t.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} setPage={setPage} total={txs.length} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
