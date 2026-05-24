import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { EmissorLayout } from './EmissorLayout';
import { Loader2, Search, ExternalLink, CheckCircle2, XCircle, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { StellarHashLink, StellarBadge } from '@/components/StellarHashLink';
import { STELLAR_PUBLIC_KEY, registerOnStellar, type StellarEntity } from '@/lib/stellar';
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
  business_status?: string | null;
  counterparty_label?: string | null;
  cycle_transaction_id?: string | null;
}

const ENTITY_LABEL: Record<string, string> = {
  voucher: 'Voucher',
  transaction: 'Pagamento',
  issuer_funds: 'Orçamento',
  issuer_beneficiary: 'Beneficiário',
  charge: 'Cobrança',
  offramp_order: 'Off-ramp',
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
  create_beneficiary: 'Cadastro de beneficiário',
  charge: 'Gerar cobrança',
  create_charge: 'Gerar cobrança',
  'charge.create': 'Cobrança gerada pelo lojista',
  offramp_burn: 'Off-ramp: queima de TESOURO',
  offramp_pix_paid: 'Off-ramp: PIX liquidado',
  offramp_queued: 'Off-ramp: aguardando liquidação',
  offramp_failed: 'Off-ramp: falha na liquidação',
  onramp_pix_settled: 'On-ramp: PIX liquidado',
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
  create_beneficiary: 'Cadastro de novo beneficiário na plataforma',
  charge: 'Lojista gerou cobrança para receber via voucher',
  create_charge: 'Lojista gerou cobrança para receber via voucher',
  'charge.create': 'Lojista gerou uma cobrança para ser paga com voucher',
  offramp_burn: 'TESOURO devolvido ao emissor on-chain (off-ramp para PIX do lojista)',
  offramp_pix_paid: 'Pagamento PIX do lojista confirmado no fluxo de off-ramp',
  offramp_queued: 'Off-ramp iniciado e aguardando confirmação final de liquidação PIX',
  offramp_failed: 'Tentativa de off-ramp falhou e requer nova tentativa de liquidação',
  onramp_pix_settled: 'PIX recebido foi convertido em TESOURO na carteira do emissor',
};

const PERIOD_OPTIONS = [5, 10, 15, 30, 45, 90];

const RETRYABLE_ENTITIES: Set<string> = new Set([
  'voucher',
  'transaction',
  'issuer_funds',
  'issuer_beneficiary',
  'voucher_category',
  'charge',
  'offramp_order',
]);

interface WalletInfo { publicKey: string; xlm: string; tesouro: string; }

interface OnrampRow {
  id: string;
  amount_brl: number;
  status: string;
  stellar_tx_hash: string | null;
  created_at: string;
  expires_at: string | null;
}

export default function EmissorBlockchain() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [onramps, setOnramps] = useState<OnrampRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [hideReversed, setHideReversed] = useState(true);
  const [periodDays, setPeriodDays] = useState<number | 'all' | 'custom'>(30);
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [issuerId, setIssuerId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [search, entityFilter, statusFilter, hideReversed, periodDays, customFrom, customTo, pageSize]);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data: iss } = await supabase.from('issuers').select('id').eq('user_id', user!.id).maybeSingle();
    if (!iss) { setRows([]); setIssuerId(null); setLoading(false); return; }
    setIssuerId(iss.id);

    // Best-effort self-healing for failed off-ramp orders linked to this issuer.
    // Keeps cycle view converging automatically without manual ops.
    await supabase.functions.invoke('offramp-retry-failed', {
      body: { max_orders: 8, lookback_hours: 72 },
    }).catch(() => undefined);

    // Ensure this issuer has its own Stellar wallet (creates + funds via friendbot on first call)
    let walletKey: string | null = null;
    const { data: w0 } = await supabase.from('issuer_stellar_wallets').select('public_key').eq('issuer_id', iss.id).maybeSingle();
    if (w0?.public_key) {
      walletKey = w0.public_key;
    } else {
      try {
        const { data: ensured } = await supabase.functions.invoke('stellar-ensure-wallet', { body: { issuer_id: iss.id } });
        if ((ensured as any)?.public_key) walletKey = (ensured as any).public_key;
      } catch (e) { console.error('ensure wallet', e); }
    }

    const historyRes = await supabase.functions.invoke('issuer-blockchain-history', { body: {} });
    if (!historyRes.error && !(historyRes.data as any)?.error) {
      setRows((((historyRes.data as any)?.rows || []) as Row[]));
      setOnramps((((historyRes.data as any)?.onramps || []) as OnrampRow[]));
    } else {
      const [issuerTxRes, actorTxRes, onrampsRes] = await Promise.all([
        supabase
          .from('blockchain_transactions')
          .select('*')
          .eq('issuer_id', iss.id)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('blockchain_transactions')
          .select('*')
          .is('issuer_id', null)
          .eq('actor_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('onramp_orders')
          .select('id, amount_brl, status, stellar_tx_hash, created_at, expires_at')
          .eq('issuer_id', iss.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (issuerTxRes.error || onrampsRes.error) {
        console.error('blockchain load error', {
          historyError: historyRes.error || (historyRes.data as any)?.error,
          issuerTxError: issuerTxRes.error,
          actorTxError: actorTxRes.error,
          onrampsError: onrampsRes.error,
        });
        toast.error('Falha ao carregar histórico blockchain');
      }

      const merged = new Map<string, Row>();
      for (const row of ((issuerTxRes.data as any[]) || [])) merged.set(row.id, row as Row);
      for (const row of ((actorTxRes.data as any[]) || [])) merged.set(row.id, row as Row);
      const mergedRows = Array.from(merged.values()).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setRows(mergedRows);
      setOnramps((onrampsRes.data as any) || []);
    }

    if (walletKey) {
      let xlm = '0', tesouro = '0';
      try {
        const r = await fetch(`https://horizon-testnet.stellar.org/accounts/${walletKey}`);
        if (r.ok) {
          const j = await r.json();
          for (const b of (j.balances || [])) {
            if (b.asset_type === 'native') xlm = b.balance;
            else if (b.asset_code === 'TESOURO') tesouro = b.balance;
          }
        }
      } catch { /* not yet funded */ }
      setWallet({ publicKey: walletKey, xlm, tesouro });
    } else {
      setWallet(null);
    }
    setLoading(false);
  }

  async function retryStellarRow(row: Row) {
    if (retryingId) return;
    if (!issuerId) {
      toast.error('Emissor não identificado para reenviar transação');
      return;
    }
    if (!RETRYABLE_ENTITIES.has(row.entity_type)) {
      toast.error(`Tipo de entidade não suportado para reenvio: ${row.entity_type}`);
      return;
    }
    if (isRowAlreadyResolved(row)) {
      toast.info('Esta transação já foi concluída com sucesso.');
      return;
    }

    setRetryingId(row.id);
    try {
      if (row.entity_type === 'offramp_order') {
        const { data: offramp, error: offrampErr } = await supabase
          .from('offramp_orders')
          .select('transaction_id')
          .eq('id', row.internal_id)
          .maybeSingle();

        if (offrampErr || !offramp?.transaction_id) {
          toast.error('Não foi possível localizar a transação do off-ramp para reenviar');
          return;
        }

        const { data, error } = await supabase.functions.invoke('etherfuse-create-offramp', {
          body: { transaction_id: offramp.transaction_id },
        });

        let msg = (data as any)?.error || error?.message;
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } catch {
            // keep parsed message fallback
          }
        }

        if (error || (data as any)?.error) {
          toast.error(`Falha no reenvio do off-ramp: ${msg || 'erro desconhecido'}`);
          return;
        }

        toast.success('Reenvio do off-ramp concluído');
        await load();
        return;
      }

      const result = await registerOnStellar({
        internal_id: row.internal_id,
        entity_type: row.entity_type as StellarEntity,
        operation: row.operation,
        amount: row.amount ?? undefined,
        issuer_id: issuerId,
      });

      if (result.success) {
        toast.success(result.cached ? 'Registro já existente na Stellar' : 'Reenvio para Stellar concluído');
        await load();
      } else {
        toast.error(`Falha no reenvio: ${result.error || 'erro desconhecido'}`);
      }
    } catch (e: any) {
      toast.error(`Falha no reenvio: ${String(e?.message ?? e)}`);
    } finally {
      setRetryingId(null);
    }
  }

  const now = Date.now();
  const filtered = rows.filter(r => {
    if (entityFilter !== 'all' && r.entity_type !== entityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (hideReversed && r.business_status === 'reversed') return false;
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
  const confirmedConsumed = filtered
    .filter(r => (r.operation === 'pay_voucher' || r.operation === 'voucher.pay') && r.status === 'success' && r.business_status === 'confirmed')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const settledOfframp = filtered
    .filter(r => r.operation === 'offramp_pix_paid' && r.status === 'success' && r.business_status !== 'reversed')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const cycleGroups = (() => {
    const sameAmount = (a?: number | null, b?: number | null) => {
      if (a == null || b == null) return false;
      return Math.abs(Number(a) - Number(b)) < 0.01;
    };

    const map = new Map<string, Row[]>();
    for (const row of filtered) {
      const key = row.cycle_transaction_id;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    return Array.from(map.entries()).map(([transactionId, groupRows]) => {
      const sortedRows = [...groupRows].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const chargeRows = sortedRows.filter((r) =>
        r.entity_type === 'charge' && (r.operation === 'charge' || r.operation === 'create_charge' || r.operation === 'charge.create'),
      );
      const payRow = sortedRows.find((r) =>
        r.entity_type === 'transaction' && (r.operation === 'pay_voucher' || r.operation === 'voucher.pay'),
      );
      const burnRow = sortedRows.find((r) => r.entity_type === 'offramp_order' && r.operation === 'offramp_burn');
      const pixRow = sortedRows.find((r) => r.entity_type === 'offramp_order' && r.operation === 'offramp_pix_paid');
      const failedOfframpRow = sortedRows.find((r) => r.entity_type === 'offramp_order' && r.operation === 'offramp_failed');
      const expectedAmount = Number(payRow?.amount ?? burnRow?.amount ?? pixRow?.amount ?? chargeRows[0]?.amount ?? 0);
      const exactChargeRow = chargeRows.find((r) => sameAmount(r.amount, expectedAmount));
      const startedAt = sortedRows[0]?.created_at;
      const counterparty = payRow?.counterparty_label || burnRow?.counterparty_label || pixRow?.counterparty_label || exactChargeRow?.counterparty_label || null;

      const chargeAmountMismatch = !!chargeRows.length && !exactChargeRow;

      return {
        transactionId,
        rows: sortedRows,
        expectedAmount,
        chargeRow: exactChargeRow,
        payRow,
        burnRow: burnRow || failedOfframpRow,
        pixRow: pixRow || failedOfframpRow,
        chargeAmountMismatch,
        startedAt,
        counterparty,
      };
    }).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  })();

  const mismatchedChargeIds = new Set(
    cycleGroups
      .filter((c) => c.chargeAmountMismatch && c.chargeRow?.internal_id)
      .map((c) => c.chargeRow!.internal_id),
  );

  const businessStatusBadge = (status?: string | null) => {
    if (status === 'confirmed' || status === 'paid' || status === 'active') {
      return <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold">NEGÓCIO OK</span>;
    }
    if (status === 'reversed' || status === 'reversed_charge') {
      return <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-[10px] font-bold">ESTORNADO</span>;
    }
    if (status === 'pending' || status === 'burning' || status === 'burned') {
      return <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">EM PROCESSO</span>;
    }
    if (status === 'failed' || status === 'expired') {
      return <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold">NEGÓCIO FALHOU</span>;
    }
    return <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/50 text-[10px] font-bold">SEM VÍNCULO</span>;
  };

  const cycleStageBadge = (row: Row | undefined, expectedAmount: number) => {
    if (!row) return <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/40 text-[10px] font-bold">NÃO GERADO</span>;
    const amountMatches = row.amount != null && Math.abs(Number(row.amount) - Number(expectedAmount)) < 0.01;
    if (!amountMatches) return <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold">VALOR DIFERENTE</span>;
    if (row.business_status === 'reversed') return <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-[10px] font-bold">ESTORNADO</span>;
    if (row.status === 'success') return <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold">OK</span>;
    if (row.status === 'pending') return <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">PENDENTE</span>;
    if (row.status === 'failed') return <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold">FALHA</span>;
    return <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/50 text-[10px] font-bold">{row.status.toUpperCase()}</span>;
  };

  const hasSuccessfulOfframpForInternalId = (internalId: string) => rows.some(x =>
    x.entity_type === 'offramp_order'
    && x.internal_id === internalId
    && x.status === 'success'
    && (x.operation === 'offramp_burn' || x.operation === 'offramp_pix_paid'),
  );

  const isRowAlreadyResolved = (row: Row) => {
    if (row.entity_type === 'offramp_order') {
      return hasSuccessfulOfframpForInternalId(row.internal_id);
    }

    return rows.some(x =>
      x.id !== row.id
      && x.status === 'success'
      && x.internal_id === row.internal_id
      && x.entity_type === row.entity_type
      && x.operation === row.operation,
    );
  };

  if (loading) return <div className="min-h-screen bg-tikin-navy flex items-center justify-center"><Loader2 className="text-tikin-orange animate-spin" /></div>;

  return (
    <EmissorLayout title="Registros na Blockchain" subtitle="Transações registradas na Stellar Testnet">
      <div className="p-4 sm:p-8 space-y-5 max-w-7xl">
        {/* Carteira do emissor */}
        <div className="bg-gradient-to-br from-tikin-orange/10 to-tikin-orange/5 border border-tikin-orange/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Carteira do emissor (Testnet)</p>
            <p className="font-mono text-sm break-all">{wallet?.publicKey || <span className="text-white/40">criando carteira do emissor…</span>}</p>
            {wallet && (
              <div className="flex gap-4 mt-2 text-[11px]">
                <span className="text-white/60">XLM: <span className="font-bold text-white">{Number(wallet.xlm).toFixed(2)}</span></span>
                <span className="text-tikin-orange">TESOURO: <span className="font-bold">{brl(Number(wallet.tesouro))}</span></span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button disabled={!wallet} onClick={() => { if (wallet) { navigator.clipboard.writeText(wallet.publicKey); toast.success('Endereço copiado'); } }} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"><Copy size={12} /> COPIAR</button>
            <a href={wallet ? `https://stellar.expert/explorer/testnet/account/${wallet.publicKey}` : '#'} onClick={e => { if (!wallet) e.preventDefault(); }} target="_blank" rel="noreferrer" className={`px-3 py-2 rounded-lg bg-tikin-orange text-xs font-bold flex items-center gap-1.5 ${!wallet ? 'opacity-40 pointer-events-none' : ''}`}><ExternalLink size={12} /> EXPLORER</a>
          </div>
        </div>

        {/* On-ramps PIX → TESOURO */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-tikin-orange font-black">Etherfuse · BRL → TESOURO</p>
              <p className="text-xs text-white/50 mt-0.5">Histórico de aportes PIX que viraram lastro on-chain na carteira do emissor</p>
            </div>
            <span className="text-[10px] text-white/40">{onramps.length} ordens</span>
          </div>
          <div className="px-5 py-2 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/50">
            <span className="uppercase font-bold text-white/40">Asset:</span>
            <span className="font-mono text-tikin-orange">TESOURO</span>
            <span className="text-white/30">·</span>
            <span className="uppercase font-bold text-white/40">Emissor on-chain (origem):</span>
            <a href={`https://stellar.expert/explorer/testnet/account/${STELLAR_PUBLIC_KEY}`} target="_blank" rel="noreferrer" className="font-mono text-white/70 hover:text-tikin-orange truncate max-w-[180px]">{STELLAR_PUBLIC_KEY.slice(0,6)}…{STELLAR_PUBLIC_KEY.slice(-4)}</a>
            <span className="text-white/30">→</span>
            <span className="uppercase font-bold text-white/40">Carteira do emissor (destino):</span>
            <a href={`https://stellar.expert/explorer/testnet/account/${wallet?.publicKey || ''}`} target="_blank" rel="noreferrer" className="font-mono text-white/70 hover:text-tikin-orange truncate max-w-[180px]">{wallet ? `${wallet.publicKey.slice(0,6)}…${wallet.publicKey.slice(-4)}` : '—'}</a>
          </div>
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-[10px] uppercase text-white/40 font-bold">
              <tr>
                <th className="px-5 py-3">Quando</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Transferência TESOURO</th>
                <th className="px-5 py-3">Hash da transação</th>
              </tr>
            </thead>
            <tbody>
              {onramps.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-white/40">Nenhum on-ramp ainda</td></tr>}
              {onramps.map(o => {
                const from = STELLAR_PUBLIC_KEY;
                const to = wallet?.publicKey || '';
                const settled = o.status === 'paid' && !!o.stellar_tx_hash;
                return (
                  <tr key={o.id} className="border-t border-white/5">
                    <td className="px-5 py-3 text-xs text-white/60 whitespace-nowrap">{format(parseISO(o.created_at), 'dd/MM/yy HH:mm')}</td>
                    <td className="px-5 py-3 text-right text-xs font-heading font-black whitespace-nowrap">R$ {brl(Number(o.amount_brl))}</td>
                    <td className="px-5 py-3">
                      {o.status === 'paid' && <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold">PAGO</span>}
                      {o.status === 'pending' && <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">PENDENTE</span>}
                      {o.status === 'expired' && <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/50 text-[10px] font-bold">EXPIRADA</span>}
                      {o.status === 'failed' && <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold">FALHA</span>}
                    </td>
                    <td className="px-5 py-3">
                      {settled ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono">
                          <a href={`https://stellar.expert/explorer/testnet/account/${from}`} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70" title={from}>{from.slice(0,4)}…{from.slice(-4)}</a>
                          <span className="text-tikin-orange">— {brl(Number(o.amount_brl))} TESOURO →</span>
                          <a href={`https://stellar.expert/explorer/testnet/account/${to}`} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-tikin-orange/10 hover:bg-tikin-orange/20 text-tikin-orange" title={to}>{to ? `${to.slice(0,4)}…${to.slice(-4)}` : '—'}</a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/30">aguardando PIX</span>
                      )}
                    </td>
                    <td className="px-5 py-3"><StellarHashLink hash={o.stellar_tx_hash} label="Pagamento TESOURO" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Consumo confirmado (voucher)</p>
            <p className="font-heading font-black text-xl mt-2">R$ {brl(confirmedConsumed)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">PIX liquidado (off-ramp ativo)</p>
            <p className="font-heading font-black text-xl mt-2">R$ {brl(settledOfframp)}</p>
          </div>
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
            <label className="h-10 px-3 rounded-md bg-[#0A1530] border border-white/10 text-xs text-white/80 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={hideReversed}
                onChange={e => setHideReversed(e.target.checked)}
                className="accent-tikin-orange"
              />
              Ocultar estornados
            </label>
          </div>
        </div>

        {/* Ciclos por transação */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-tikin-orange font-black">Ciclo auditável por transação</p>
                <p className="text-xs text-white/50 mt-0.5">Cobrança -&gt; Uso de voucher -&gt; Off-ramp burn -&gt; PIX pago</p>
            </div>
            <span className="text-[10px] text-white/40">{cycleGroups.length} ciclos</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/10 text-[10px] uppercase text-white/40 font-bold">
              <tr>
                <th className="px-5 py-3">Quando</th>
                <th className="px-5 py-3">Tx base</th>
                <th className="px-5 py-3">Contraparte</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3">Cobrança</th>
                <th className="px-5 py-3">Voucher</th>
                <th className="px-5 py-3">Burn</th>
                <th className="px-5 py-3">PIX</th>
              </tr>
            </thead>
            <tbody>
              {cycleGroups.length === 0 && <tr><td colSpan={8} className="px-5 py-8 text-center text-xs text-white/40">Nenhum ciclo no filtro atual</td></tr>}
              {cycleGroups.map(c => (
                <tr key={c.transactionId} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-xs text-white/60 whitespace-nowrap">{c.startedAt ? format(parseISO(c.startedAt), 'dd/MM/yy HH:mm:ss') : '—'}</td>
                  <td className="px-5 py-3 text-[10px] font-mono text-white/50">{c.transactionId.slice(0, 8)}…</td>
                  <td className="px-5 py-3 text-[10px] text-white/70">{c.counterparty || '—'}</td>
                  <td className="px-5 py-3 text-right text-xs font-heading font-black">R$ {brl(c.expectedAmount)}</td>
                  <td className="px-5 py-3">{cycleStageBadge(c.chargeRow, c.expectedAmount)}</td>
                  <td className="px-5 py-3">{cycleStageBadge(c.payRow, c.expectedAmount)}</td>
                  <td className="px-5 py-3">{cycleStageBadge(c.burnRow, c.expectedAmount)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {cycleStageBadge(c.pixRow, c.expectedAmount)}
                      {c.chargeAmountMismatch && (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold">COBRANÇA DIVERGENTE</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <th className="px-5 py-4">Status de negócio</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-white/40">Nenhum registro</td></tr>}
              {pageRows.map(r => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-xs text-white/60">{format(parseISO(r.created_at), 'dd/MM/yy HH:mm:ss')}</td>
                  <td className="px-5 py-3 text-xs max-w-xs">
                    <p className="font-semibold">{OP_LABEL[r.operation] || r.operation}</p>
                    <p className="text-[10px] text-white/40">{ENTITY_LABEL[r.entity_type] || r.entity_type}</p>
                    <p className="text-[10px] text-white/50 mt-1 leading-snug">{OP_DESC[r.operation] || 'Operação registrada na blockchain'}</p>
                    {r.counterparty_label && <p className="text-[10px] text-tikin-orange/90 mt-1 leading-snug">{r.counterparty_label}</p>}
                  </td>
                  <td className="px-5 py-3 text-[10px] font-mono text-white/50">{r.internal_id.slice(0, 8)}…</td>
                  <td className="px-5 py-3 text-right text-xs font-heading font-black">{r.amount ? `R$ ${brl(r.amount)}` : '—'}</td>
                  <td className="px-5 py-3"><StellarHashLink hash={r.stellar_tx_hash} /></td>
                  <td className="px-5 py-3">
                    {r.status === 'success' && <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold">SUCESSO</span>}
                    {r.status === 'failed' && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold" title={r.error || ''}>FALHA</span>
                        {isRowAlreadyResolved(r) ? (
                          <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-300 text-[10px] font-bold">JÁ RESOLVIDO</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => retryStellarRow(r)}
                            disabled={!!retryingId}
                            className="px-2 py-0.5 rounded-md border border-tikin-orange/40 bg-tikin-orange/10 text-tikin-orange text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {retryingId === r.id ? 'Reenviando...' : 'Reenviar'}
                          </button>
                        )}
                      </div>
                    )}
                    {r.status === 'pending' && <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">PENDENTE</span>}
                    {r.status === 'superseded' && <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/60 text-[10px] font-bold">SUPERSEDED</span>}
                  </td>
                  <td className="px-5 py-3">
                    {r.entity_type === 'charge' && mismatchedChargeIds.has(r.internal_id)
                      ? <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold">INCONSISTENTE</span>
                      : businessStatusBadge(r.business_status)}
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
