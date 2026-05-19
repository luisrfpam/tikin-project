import { brl } from '@/lib/format';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MobileNav } from '@/components/layout/MobileNav';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useCategories, categoryLabel } from '@/lib/categories';
import { enrichBeneficiaryNames } from '@/lib/enrichTx';
import { StellarHashLink } from '@/components/StellarHashLink';


interface Tx {
  id: string;
  voucher_id: string;
  amount: number;
  status: string;
  created_at: string;
  tx_type: string;
  fee_percent: number;
  voucher_category: string | null;
  beneficiary_name: string | null;
  description: string | null;
}

const PERIODS = [
  { label: '5 dias', days: 5 },
  { label: '10 dias', days: 10 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
  { label: 'Personalizado', days: -1 },
];

export default function LojistaExtrato() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const cats = useCategories();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [offramps, setOfframps] = useState<Record<string, { status: string; stellar_burn_tx_hash: string | null; error: string | null }>>({});
  const [period, setPeriod] = useState(30);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<string>('todos');
  const [merchantStatus, setMerchantStatus] = useState<string>('active');

  useEffect(() => {
    if (!user) return;
    supabase.from('establishments').select('id, status').eq('user_id', user.id).single().then(async ({ data: est }) => {
      if (!est) return;
      setMerchantStatus((est as any).status || 'active');
      const { data } = await supabase.from('transactions').select('*')
        .eq('establishment_id', est.id).order('created_at', { ascending: false });
      const enriched = await enrichBeneficiaryNames((data as Tx[]) ?? []);
      setTransactions(enriched);
      const txIds = enriched.map(t => t.id);
      if (txIds.length) {
        const { data: ofs } = await supabase.from('offramp_orders')
          .select('transaction_id, status, stellar_burn_tx_hash, error')
          .in('transaction_id', txIds);
        const map: Record<string, any> = {};
        (ofs ?? []).forEach((o: any) => { map[o.transaction_id] = o; });
        setOfframps(map);
      }
    });
  }, [user]);


  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => t.voucher_category && set.add(t.voucher_category));
    return ['todos', ...Array.from(set)];
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (category !== 'todos') list = list.filter(t => t.voucher_category === category);
    let start: Date | null = null;
    let end: Date | null = null;
    if (period === -1) {
      if (startDate) start = new Date(startDate + 'T00:00:00');
      if (endDate) end = new Date(endDate + 'T23:59:59');
    } else {
      end = new Date();
      start = new Date(); start.setDate(start.getDate() - period);
    }
    return list.filter(t => {
      const d = new Date(t.created_at);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [transactions, category, period, startDate, endDate]);

  const totals = useMemo(() => {
    const credit = filtered.filter(t => t.tx_type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
    const debit = filtered.filter(t => t.tx_type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
    return { credit, debit, net: credit - debit };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#FFFAF5] pb-28">
      <nav className="bg-tikin-orange px-6 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 max-w-md mx-auto">
          <button onClick={() => navigate('/lojista')} className="text-white"><ArrowLeft size={22} /></button>
          <img src="/logo-fundo-branco.png" alt="TIKIN" className="h-6" />
          <button onClick={signOut} className="text-white/70 text-xs font-extrabold">SAIR</button>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        {/* Header + status */}
        <div className="flex items-center justify-between">
          <h1 className="font-heading font-black text-2xl text-tikin-navy">Extrato</h1>
          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            merchantStatus === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            Loja {merchantStatus === 'active' ? 'ativa' : 'inativa'}
          </span>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-card grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-tikin-navy/40 font-bold uppercase">Créditos</p>
            <p className="font-heading font-black text-success text-sm">+ R$ {brl(totals.credit)}</p>
          </div>
          <div className="border-x border-tikin-navy/5">
            <p className="text-[10px] text-tikin-navy/40 font-bold uppercase">Estornos</p>
            <p className="font-heading font-black text-destructive text-sm">- R$ {brl(totals.debit)}</p>
          </div>
          <div>
            <p className="text-[10px] text-tikin-navy/40 font-bold uppercase">Líquido</p>
            <p className="font-heading font-black text-tikin-navy text-sm">R$ {brl(totals.net)}</p>
          </div>
        </div>

        {/* Period filter */}
        <div className="bg-white rounded-2xl p-4 shadow-card space-y-3">
          <p className="text-[10px] font-extrabold text-tikin-navy/50 uppercase tracking-wider flex items-center gap-1">
            <Filter size={12} /> Período
          </p>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button key={p.label} onClick={() => setPeriod(p.days)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                  period === p.days ? 'bg-tikin-orange text-white' : 'bg-[#F7F8FA] text-tikin-navy/60'
                }`}>{p.label}</button>
            ))}
          </div>
          {period === -1 && (
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-xs" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-xs" />
            </div>
          )}
        </div>

        {/* Category filter */}
        <div className="bg-white rounded-2xl p-4 shadow-card space-y-3">
          <p className="text-[10px] font-extrabold text-tikin-navy/50 uppercase tracking-wider">Tipo de voucher</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                  category === c ? 'bg-tikin-orange text-white' : 'bg-[#F7F8FA] text-tikin-navy/60'
                }`}>{c === 'todos' ? 'Todos' : categoryLabel(c, cats)}</button>
            ))}
          </div>
        </div>

        {/* Transactions list */}
        <div className="bg-white rounded-2xl shadow-card divide-y divide-tikin-navy/5">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-tikin-navy/50">Nenhuma transação no período.</p>
          ) : filtered.map(tx => {
            const isCredit = tx.tx_type === 'credit';
            const off = offramps[tx.id];
            const offLabel = off ? ({
              pending: 'Off-ramp pendente',
              burning: 'Queimando TESOURO',
              burned: 'Aguardando PIX',
              paid: 'PIX recebido',
              failed: 'Off-ramp falhou',
            } as Record<string, string>)[off.status] ?? off.status : null;
            const offTone = off?.status === 'paid' ? 'bg-success/10 text-success'
              : off?.status === 'failed' ? 'bg-destructive/10 text-destructive'
              : 'bg-tikin-orange/10 text-tikin-orange';
            return (
              <div key={tx.id} className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isCredit ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }`}>
                  {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-tikin-navy text-sm truncate">
                        {tx.beneficiary_name || 'Beneficiário'}
                      </p>
                      <p className="text-[11px] text-tikin-navy/50">
                        {categoryLabel(tx.voucher_category) || 'Geral'} · taxa {Number(tx.fee_percent).toFixed(1)}%
                      </p>
                      {tx.description && <p className="text-[11px] text-tikin-navy/40 truncate">{tx.description}</p>}
                      <p className="text-[10px] text-tikin-navy/40 mt-0.5">
                        {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                      {off && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${offTone}`}>{offLabel}</span>
                          {off.stellar_burn_tx_hash && (
                            <StellarHashLink hash={off.stellar_burn_tx_hash} label="Queima TESOURO" />
                          )}
                          {off.status === 'failed' && off.error && (
                            <span className="text-[10px] text-destructive/70 italic">{off.error}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`font-heading font-black text-sm ${isCredit ? 'text-success' : 'text-destructive'}`}>
                      {isCredit ? '+' : '-'} R$ {brl(Number(tx.amount))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </main>
      <MobileNav />
    </div>
  );
}
