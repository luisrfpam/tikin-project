import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { EmissorLayout } from './EmissorLayout';
import { Loader2, Search, ExternalLink, CheckCircle2, XCircle, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { StellarHashLink, StellarBadge } from '@/components/StellarHashLink';
import { STELLAR_PUBLIC_KEY, stellarExplorerUrl } from '@/lib/stellar';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { brl } from '@/lib/format';

interface Row {
  id: string;
  internal_id: string;
  entity_type: string;
  operation: string;
  amount: number | null;
  stellar_tx_hash: string | null;
  stellar_ledger: number | null;
  status: string;
  error: string | null;
  created_at: string;
}

const ENTITY_LABEL: Record<string, string> = {
  voucher: 'Voucher',
  transaction: 'Pagamento',
  issuer_funds: 'Orçamento',
  issuer_beneficiary: 'Beneficiário',
  charge: 'Cobrança',
};

const OP_LABEL: Record<string, string> = {
  create_voucher: 'Emissão de voucher',
  'voucher.create': 'Emissão de voucher',
  pay_voucher: 'Uso de voucher',
  'voucher.pay': 'Pagamento com voucher',
  allocate_budget: 'Definir orçamento',
  update_budget: 'Atualizar orçamento',
  'funds.set_budget': 'Definir orçamento mensal',
  link_beneficiary: 'Vincular beneficiário',
  'beneficiary.link': 'Vinculação de beneficiário',
  create_charge: 'Gerar cobrança',
  'charge.create': 'Cobrança gerada pelo lojista',
};

const OP_DESC: Record<string, string> = {
  create_voucher: 'Emitente carregou saldo no voucher do beneficiário',
  'voucher.create': 'Emitente carregou saldo no voucher do beneficiário',
  pay_voucher: 'Beneficiário usou o voucher para pagar um lojista',
  'voucher.pay': 'Beneficiário usou o voucher para pagar um lojista',
  allocate_budget: 'Emitente definiu o orçamento mensal e os limites por categoria',
  update_budget: 'Emitente atualizou valores do orçamento mensal',
  'funds.set_budget': 'Emitente definiu/atualizou o orçamento mensal e os limites por categoria',
  link_beneficiary: 'Emitente vinculou um beneficiário para receber vouchers',
  'beneficiary.link': 'Emitente vinculou um beneficiário ao seu programa para que possa receber vouchers (operação não-financeira)',
  create_charge: 'Lojista gerou cobrança para receber via voucher',
  'charge.create': 'Lojista gerou uma cobrança para ser paga com voucher',
};

const PERIOD_OPTIONS = [5, 10, 15, 30, 45, 90];

export default function EmissorBlockchain() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [periodDays, setPeriodDays] = useState<number | 'all' | 'custom'>(30);
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { setPage(1); }, [search, entityFilter, statusFilter, periodDays, customFrom, customTo, pageSize]);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('blockchain_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setRows((data as any) || []);
    setLoading(false);
  }

  const now = Date.now();
  const filtered = rows.filter(r => {
    if (entityFilter !== 'all' && r.entity_type !== entityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const t = new Date(r.created_at).getTime();
    if (periodDays === 'custom') {
      if (customFrom && t < new Date(customFrom).getTime()) return false;
      if (customTo && t > new Date(customTo).getTime() + 86400000) return false;
    } else if (periodDays !== 'all') {
      if (t < now - periodDays * 86400000) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!(r.stellar_tx_hash || '').toLowerCase().includes(q) &&
          !(r.internal_id || '').toLowerCase().includes(q) &&
          !(r.operation || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const successCount = filtered.filter(r => r.status === 'success').length;
  const failedCount = filtered.filter(r => r.status === 'failed').length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <div className="min-h-screen bg-tikin-navy flex items-center justify-center"><Loader2 className="text-tikin-orange animate-spin" /></div>;

  return (
    <EmissorLayout title="Registros na Blockchain" subtitle="Transações registradas na Stellar Testnet" right={<StellarBadge />}>
      <div className="p-4 sm:p-8 space-y-5 max-w-7xl">
        {/* Carteira */}
        <div className="bg-gradient-to-br from-tikin-orange/10 to-tikin-orange/5 border border-tikin-orange/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Carteira do emissor (Testnet)</p>
            <p className="font-mono text-sm break-all">{STELLAR_PUBLIC_KEY}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(STELLAR_PUBLIC_KEY); toast.success('Endereço copiado'); }} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-1.5"><Copy size={12} /> COPIAR</button>
            <a href={`https://stellar.expert/explorer/testnet/account/${STELLAR_PUBLIC_KEY}`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-tikin-orange text-xs font-bold flex items-center gap-1.5"><ExternalLink size={12} /> EXPLORER</a>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid sm:grid-cols-3 gap-3">
          <button onClick={() => setStatusFilter('all')} className={`text-left bg-white/5 border rounded-2xl p-5 transition ${statusFilter === 'all' ? 'border-tikin-orange/50' : 'border-white/10 hover:border-white/20'}`}>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Total no período</p>
            <p className="font-heading font-black text-xl mt-2">{filtered.length}</p>
          </button>
          <button onClick={() => setStatusFilter(statusFilter === 'success' ? 'all' : 'success')} className={`text-left bg-green-500/5 border rounded-2xl p-5 transition ${statusFilter === 'success' ? 'border-green-400' : 'border-green-500/20 hover:border-green-500/40'}`}>
            <p className="text-[10px] uppercase tracking-widest text-green-300/70 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Sucesso</p>
            <p className="font-heading font-black text-xl mt-2 text-green-400">{successCount}</p>
          </button>
          <button onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')} className={`text-left bg-red-500/5 border rounded-2xl p-5 transition ${statusFilter === 'failed' ? 'border-red-400' : 'border-red-500/20 hover:border-red-500/40'}`}>
            <p className="text-[10px] uppercase tracking-widest text-red-300/70 font-bold flex items-center gap-1"><XCircle size={12} /> Falhas</p>
            <p className="font-heading font-black text-xl mt-2 text-red-400">{failedCount}</p>
          </button>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mr-1">Período:</span>
            {PERIOD_OPTIONS.map(d => (
              <button key={d} onClick={() => setPeriodDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${periodDays === d ? 'bg-tikin-orange text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{d} dias</button>
            ))}
            <button onClick={() => setPeriodDays('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${periodDays === 'all' ? 'bg-tikin-orange text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>Todos</button>
            <button onClick={() => setPeriodDays('custom')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${periodDays === 'custom' ? 'bg-tikin-orange text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>Personalizado</button>
            {periodDays === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-9 rounded-md bg-[#0A1530] border border-white/10 px-2 text-xs text-white" />
                <span className="text-white/40 text-xs">até</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-9 rounded-md bg-[#0A1530] border border-white/10 px-2 text-xs text-white" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar hash ou id interno…" className="pl-9 bg-white/5 border-white/10 text-white" />
            </div>
            <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="h-10 rounded-md bg-[#0A1530] border border-white/10 px-3 text-sm">
              <option value="all" className="bg-[#0A1530]">Tipo: Todos</option>
              {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-[#0A1530]">{v}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="h-10 rounded-md bg-[#0A1530] border border-white/10 px-3 text-sm">
              <option value="all" className="bg-[#0A1530]">Status: Todos</option>
              <option value="success" className="bg-[#0A1530]">Sucesso</option>
              <option value="failed" className="bg-[#0A1530]">Falha</option>
              <option value="pending" className="bg-[#0A1530]">Pendente</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/10 text-[10px] uppercase text-white/40 font-bold">
              <tr>
                <th className="px-5 py-4">Quando</th>
                <th className="px-5 py-4">Operação</th>
                <th className="px-5 py-4">ID interno</th>
                <th className="px-5 py-4 text-right">Valor</th>
                <th className="px-5 py-4">Hash Stellar</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-white/40">Nenhum registro</td></tr>}
              {pageRows.map(r => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-xs text-white/60">{format(parseISO(r.created_at), 'dd/MM/yy HH:mm:ss')}</td>
                  <td className="px-5 py-3 text-xs max-w-xs">
                    <p className="font-semibold">{OP_LABEL[r.operation] || r.operation}</p>
                    <p className="text-[10px] text-white/40">{ENTITY_LABEL[r.entity_type] || r.entity_type}</p>
                    <p className="text-[10px] text-white/50 mt-1 leading-snug">{OP_DESC[r.operation] || 'Operação registrada na blockchain'}</p>
                  </td>
                  <td className="px-5 py-3 text-[10px] font-mono text-white/50">{r.internal_id.slice(0, 8)}…</td>
                  <td className="px-5 py-3 text-right text-xs font-heading font-black">{r.amount ? `R$ ${brl(r.amount)}` : '—'}</td>
                  <td className="px-5 py-3"><StellarHashLink hash={r.stellar_tx_hash} /></td>
                  <td className="px-5 py-3">
                    {r.status === 'success' && <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold">SUCESSO</span>}
                    {r.status === 'failed' && <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold" title={r.error || ''}>FALHA</span>}
                    {r.status === 'pending' && <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">PENDENTE</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <span>Mostrando</span>
                <span className="text-white font-bold">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)}</span>
                <span>de</span>
                <span className="text-white font-bold">{filtered.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <span>Por página:</span>
                  <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-7 rounded-md bg-[#0A1530] border border-white/10 px-2 text-xs text-white">
                    {[10, 25, 50, 100].map(n => <option key={n} value={n} className="bg-[#0A1530]">{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"><ChevronLeft size={14} /></button>
                  <span className="text-[11px] text-white/60 px-2">Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{totalPages}</span></span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"><ChevronRight size={14} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </EmissorLayout>
  );
}
