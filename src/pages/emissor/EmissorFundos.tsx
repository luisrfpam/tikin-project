import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Loader2, Save, Copy, Pencil, X, TrendingUp, Wallet, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { EmissorLayout } from './EmissorLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fmtBRL, formatBRLInput, parseBRLInput } from '@/lib/utils';
import { format, startOfMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCategories, categoryLabel } from '@/lib/categories';
import { registerOnStellar, stellarExplorerUrl } from '@/lib/stellar';
import { StellarHashLink } from '@/components/StellarHashLink';
import { EtherfusePixModal } from '@/components/EtherfusePixModal';

interface Fund {
  id: string;
  month: string;
  monthly_budget: number;
  allocated: number;
  notes: string | null;
  category_caps: Record<string, number> | null;
  category_allocated: Record<string, number> | null;
  auto_rollover: boolean;
  last_stellar_tx_hash?: string | null;
  status?: 'active' | 'pending_funding' | 'failed';
}



const currentMonthStr = () => format(startOfMonth(new Date()), 'yyyy-MM');

export default function EmissorFundos() {
  const { user } = useAuth();
  const cats = useCategories();
  const [issuerId, setIssuerId] = useState<string | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Fund | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pixModal, setPixModal] = useState<{ fundId: string; amount: number } | null>(null);

  useEffect(() => { if (user) load(); }, [user]);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    const { data: iss } = await supabase.from('issuers').select('id').eq('user_id', user!.id).maybeSingle();
    if (!iss) { if (showSpinner) setLoading(false); return; }
    setIssuerId(iss.id);
    const { data } = await supabase.from('issuer_funds').select('*').eq('issuer_id', iss.id).order('month', { ascending: false });
    setFunds((data as any[] as Fund[]) || []);
    if (showSpinner) setLoading(false);
  }

  const currentFund = useMemo(() => funds.find(f => f.month.startsWith(currentMonthStr())) || null, [funds]);
  const ytdBudget = useMemo(() => funds.reduce((s, f) => s + Number(f.monthly_budget), 0), [funds]);
  const ytdAllocated = useMemo(() => funds.reduce((s, f) => s + Number(f.allocated), 0), [funds]);
  const usagePct = currentFund && currentFund.monthly_budget > 0
    ? Math.min(100, (Number(currentFund.allocated) / Number(currentFund.monthly_budget)) * 100)
    : 0;

  if (loading) return <div className="min-h-screen bg-tikin-navy flex items-center justify-center"><Loader2 className="text-tikin-orange animate-spin" /></div>;

  return (
    <EmissorLayout title="Gestão de Fundos" subtitle="Planeje e acompanhe o orçamento mensal de emissão">
      <div className="p-4 sm:p-8 space-y-6 max-w-6xl">
        {/* KPI cards */}
        <div className="grid sm:grid-cols-4 gap-3">
          <KCard icon={<Wallet size={16} />} label="Orçamento do mês" value={`R$ ${fmtBRL(currentFund?.monthly_budget || 0)}`} hint={currentFund ? format(parseISO(currentFund.month), "MMMM 'de' yyyy", { locale: ptBR }) : 'Não definido'} />
          <KCard icon={<TrendingUp size={16} />} label="Alocado no mês" value={`R$ ${fmtBRL(currentFund?.allocated || 0)}`} hint={`${usagePct.toFixed(1)}% utilizado`} />
          <KCard
            icon={<CheckCircle2 size={16} />}
            label="Disponível agora"
            value={`R$ ${fmtBRL(Math.max(0, Number(currentFund?.monthly_budget || 0) - Number(currentFund?.allocated || 0)))}`}
            accent
          />
          <KCard icon={<Calendar size={16} />} label="Total acumulado (orçado)" value={`R$ ${fmtBRL(ytdBudget)}`} hint={`Alocado: R$ ${fmtBRL(ytdAllocated)}`} />
        </div>

        {/* Current month progress */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h3 className="font-heading font-black text-sm">Utilização do mês corrente</h3>
              <p className="text-xs text-white/40 mt-1">{currentFund ? format(parseISO(currentFund.month), "MMMM 'de' yyyy", { locale: ptBR }) : 'Sem orçamento configurado para este mês'}</p>
            </div>
            <div className="flex gap-2">
              {currentFund ? (
                <button onClick={() => { setEditing(currentFund); setShowForm(true); }} className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-2"><Pencil size={12} /> EDITAR</button>
              ) : (
                <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-tikin-orange text-xs font-heading font-black flex items-center gap-2"><Save size={12} /> DEFINIR ORÇAMENTO</button>
              )}
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-500' : 'bg-tikin-orange'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] uppercase tracking-widest text-white/40 font-bold">
            <span>R$ {fmtBRL(currentFund?.allocated || 0)} alocado</span>
            <span>{usagePct.toFixed(1)}%</span>
            <span>R$ {fmtBRL(currentFund?.monthly_budget || 0)} orçado</span>
          </div>

          {/* Per-category breakdown */}
          {currentFund && currentFund.category_caps && Object.keys(currentFund.category_caps).length > 0 && (
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              {Object.entries(currentFund.category_caps).map(([cat, cap]) => {
                const used = Number(currentFund.category_allocated?.[cat] || 0);
                const pct = cap > 0 ? Math.min(100, (used / Number(cap)) * 100) : 0;
                const catLabel = categoryLabel(cat, cats);
                return (
                  <div key={cat} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between text-[11px] mb-2"><span className="font-bold">{catLabel}</span><span className="text-white/60">R$ {fmtBRL(used)} / R$ {fmtBRL(Number(cap))}</span></div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full ${pct >= 90 ? 'bg-red-500' : 'bg-tikin-orange'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!currentFund && (
            <div className="mt-4 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-200">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p>Defina o orçamento mensal para liberar a emissão de vouchers. Sem orçamento, a emissão é bloqueada.</p>
            </div>
          )}
        </div>

        {/* History table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h3 className="font-heading font-black text-sm">Histórico de orçamentos</h3>
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-tikin-orange text-xs font-heading font-black flex items-center gap-2"><Save size={12} /> NOVO PERÍODO</button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-[10px] uppercase text-white/40">
              <tr>
                <th className="px-6 py-3">Mês</th>
                <th className="px-6 py-3 text-right">Orçamento</th>
                <th className="px-6 py-3 text-right">Alocado</th>
                <th className="px-6 py-3 text-right">Disponível</th>
                <th className="px-6 py-3 w-48">Utilização</th>
                <th className="px-6 py-3">Blockchain</th>
                <th className="px-6 py-3 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {funds.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-white/40">Nenhum orçamento cadastrado</td></tr>}
              {funds.map(f => {
                const disp = Number(f.monthly_budget) - Number(f.allocated);
                const pct = Number(f.monthly_budget) > 0 ? Math.min(100, (Number(f.allocated) / Number(f.monthly_budget)) * 100) : 0;
                return (
                  <tr key={f.id} className="border-t border-white/5">
                    <td className="px-6 py-4 text-sm capitalize font-semibold">
                      {format(parseISO(f.month), "MMMM 'de' yyyy", { locale: ptBR })}
                      {f.status === 'pending_funding' && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] uppercase font-heading font-black bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">Aguardando PIX</span>
                      )}
                      {f.status === 'failed' && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] uppercase font-heading font-black bg-red-500/15 text-red-300 border border-red-500/30">Falhou</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-heading font-black text-sm">R$ {fmtBRL(Number(f.monthly_budget))}</td>
                    <td className="px-6 py-4 text-right text-sm">R$ {fmtBRL(Number(f.allocated))}</td>
                    <td className={`px-6 py-4 text-right font-bold text-sm ${disp <= 0 ? 'text-red-400' : 'text-green-400'}`}>R$ {fmtBRL(disp)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-tikin-orange'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-white/60 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StellarHashLink hash={f.last_stellar_tx_hash} /></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                        {f.status === 'pending_funding' && (
                          <button title="Retomar PIX" onClick={() => setPixModal({ fundId: f.id, amount: Number(f.monthly_budget) })} className="p-2 rounded-md bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300"><Wallet size={12} /></button>
                        )}
                        <button title="Editar" onClick={() => { setEditing(f); setShowForm(true); }} className="p-2 rounded-md bg-white/5 hover:bg-white/10"><Pencil size={12} /></button>
                        <button title="Duplicar para próximo mês" onClick={() => { setEditing({ ...f, id: '', month: format(addMonths(parseISO(f.month), 1), 'yyyy-MM-01'), allocated: 0, category_allocated: {} }); setShowForm(true); }} className="p-2 rounded-md bg-white/5 hover:bg-white/10"><Copy size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && issuerId && (
        <FundFormModal
          issuerId={issuerId}
          initial={editing}
          previousFund={funds[0] || null}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={(fundId, isNew, amount) => {
            setShowForm(false); setEditing(null);
            if (isNew && fundId) {
              setPixModal({ fundId, amount });
            }
            load();
          }}
        />
      )}

      {pixModal && (
        <EtherfusePixModal
          amountBRL={pixModal.amount}
          issuerFundsId={pixModal.fundId}
          onClose={() => { setPixModal(null); load(); }}
          onPaid={() => { load(false); }}
        />
      )}
    </EmissorLayout>
  );
}

function KCard({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-tikin-orange/10 border-tikin-orange/30' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center gap-2 text-white/40">{icon}<p className="text-[10px] font-heading font-bold uppercase tracking-widest">{label}</p></div>
      <p className={`font-heading font-black text-xl mt-2 ${accent ? 'text-tikin-orange' : ''}`}>{value}</p>
      {hint && <p className="text-[11px] text-white/40 mt-1 capitalize">{hint}</p>}
    </div>
  );
}

function FundFormModal({ issuerId, initial, previousFund, onClose, onSaved }: { issuerId: string; initial: Fund | null; previousFund: Fund | null; onClose: () => void; onSaved: (fundId: string, isNew: boolean, amount: number) => void }) {
  const cats = useCategories();
  const [month, setMonth] = useState(initial ? initial.month.slice(0, 7) : currentMonthStr());
  const [budget, setBudget] = useState(initial ? fmtBRL(Number(initial.monthly_budget)) : '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [autoRollover, setAutoRollover] = useState(initial?.auto_rollover || false);
  const [caps, setCaps] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (initial?.category_caps) Object.entries(initial.category_caps).forEach(([k, v]) => { init[k] = fmtBRL(Number(v)); });
    return init;
  });
  const [enableCaps, setEnableCaps] = useState(initial?.category_caps && Object.keys(initial.category_caps).length > 0);
  const [saving, setSaving] = useState(false);

  const budgetNum = parseBRLInput(budget);
  const capsTotal = Object.values(caps).reduce((s, v) => s + parseBRLInput(v), 0);
  const capsOverBudget = enableCaps && capsTotal > budgetNum && budgetNum > 0;

  function copyFromPrevious() {
    if (!previousFund) return toast.info('Nenhum período anterior para copiar');
    setBudget(fmtBRL(Number(previousFund.monthly_budget)));
    setNotes(previousFund.notes || '');
    setAutoRollover(previousFund.auto_rollover);
    if (previousFund.category_caps && Object.keys(previousFund.category_caps).length > 0) {
      const next: Record<string, string> = {};
      Object.entries(previousFund.category_caps).forEach(([k, v]) => { next[k] = fmtBRL(Number(v)); });
      setCaps(next); setEnableCaps(true);
    }
    toast.success('Dados copiados do período anterior');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!(budgetNum > 0)) return toast.error('Informe um valor de orçamento válido');
    if (capsOverBudget) return toast.error('A soma dos limites por categoria excede o orçamento');
    setSaving(true);
    const category_caps: Record<string, number> = {};
    if (enableCaps) Object.entries(caps).forEach(([k, v]) => { const n = parseBRLInput(v); if (n > 0) category_caps[k] = n; });
    const payload: any = {
      issuer_id: issuerId,
      month: `${month}-01`,
      monthly_budget: budgetNum,
      notes: notes.trim() || null,
      category_caps,
      auto_rollover: autoRollover,
    };
    const { data: saved, error } = await supabase.from('issuer_funds').upsert(payload, { onConflict: 'issuer_id,month' }).select().single();
    if (error) { setSaving(false); return toast.error(error.message); }
    // Register on Stellar Testnet (non-blocking failure)
    const stellar = await registerOnStellar({
      internal_id: (saved as any).id,
      entity_type: 'issuer_funds',
      operation: initial?.id ? 'update_budget' : 'allocate_budget',
      amount: budgetNum,
      issuer_id: issuerId,
    });
    setSaving(false);
    if (stellar.success && stellar.hash) {
      toast.success(`Orçamento salvo e registrado na Stellar (${stellar.hash.slice(0, 8)}…)`);
    } else {
      toast.success(initial?.id ? 'Orçamento atualizado' : 'Orçamento criado');
      if (stellar.error) toast.warning('Falha ao registrar na Stellar: ' + stellar.error);
    }
    onSaved((saved as any).id, !initial?.id, budgetNum);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F1729] border border-white/10 rounded-3xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-heading font-black text-lg">{initial?.id ? 'Editar orçamento' : 'Novo orçamento mensal'}</h2>
            <p className="text-xs text-white/40 mt-1">Defina quanto pode ser emitido em vouchers no período</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"><X size={16} /></button>
        </div>

        <form onSubmit={save} className="space-y-5">
          {previousFund && !initial?.id && (
            <button type="button" onClick={copyFromPrevious} className="w-full py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-2">
              <Copy size={12} /> COPIAR DO PERÍODO ANTERIOR
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase text-white/40 font-bold">Período (mês)</Label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} required disabled={!!initial?.id} className="bg-white/5 border-white/10 text-white mt-2 disabled:opacity-60" />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-white/40 font-bold">Orçamento total (R$)</Label>
              <Input inputMode="numeric" value={budget} onChange={e => setBudget(formatBRLInput(e.target.value))} required placeholder="0,00" className="bg-white/5 border-white/10 text-white mt-2 font-mono font-bold" />
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={!!enableCaps} onChange={e => setEnableCaps(e.target.checked)} className="w-4 h-4 rounded accent-tikin-orange" />
              <div>
                <p className="text-sm font-bold">Limitar por categoria</p>
                <p className="text-[11px] text-white/40">Defina um teto máximo de gasto por tipo de voucher</p>
              </div>
            </label>
            {enableCaps && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {cats.map(c => (
                  <div key={c.id}>
                    <Label className="text-[10px] uppercase text-white/40 font-bold">{c.label}</Label>
                    <Input
                      inputMode="numeric"
                      value={caps[c.id] || ''}
                      onChange={e => setCaps(prev => ({ ...prev, [c.id]: formatBRLInput(e.target.value) }))}
                      placeholder="0,00 (sem limite)"
                      className="bg-white/5 border-white/10 text-white mt-1 text-sm"
                    />
                  </div>
                ))}
                <div className="col-span-2 flex justify-between text-[11px] mt-1">
                  <span className="text-white/40">Soma dos limites</span>
                  <span className={capsOverBudget ? 'text-red-400 font-bold' : 'text-white/70 font-bold'}>R$ {fmtBRL(capsTotal)} / R$ {fmtBRL(budgetNum)}</span>
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <input type="checkbox" checked={autoRollover} onChange={e => setAutoRollover(e.target.checked)} className="w-4 h-4 rounded accent-tikin-orange" />
            <div>
              <p className="text-sm font-bold">Renovar automaticamente</p>
              <p className="text-[11px] text-white/40">Replica este orçamento para os próximos meses (referência operacional)</p>
            </div>
          </label>

          <div>
            <Label className="text-[10px] uppercase text-white/40 font-bold">Observações</Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex.: Aporte referente ao mês de competência..."
              className="w-full mt-2 bg-white/5 border border-white/10 rounded-md text-white text-sm px-3 py-2 resize-none focus:outline-none focus:border-tikin-orange/50"
            />
            <p className="text-[10px] text-white/40 mt-1 text-right">{notes.length}/500</p>
          </div>

          <button type="submit" disabled={saving || capsOverBudget} className="w-full py-4 bg-tikin-orange rounded-xl font-heading font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {initial?.id ? 'SALVAR ALTERAÇÕES' : 'CRIAR ORÇAMENTO'}
          </button>
        </form>
      </div>
    </div>
  );
}
