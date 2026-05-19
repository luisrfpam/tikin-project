import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { toast } from 'sonner';
import { mockBlockchainSettle, addAuditLog } from '@/lib/supabase-helpers';
import { registerOnStellar } from '@/lib/stellar';
import { Check, Loader2, Store, ChevronRight, AlertTriangle, Search, ArrowLeft, Pencil } from 'lucide-react';
import { categoryLabel } from '@/lib/categories';
import { differenceInDays, format } from 'date-fns';
import { useIssuerScope, IssuerBadge } from '@/lib/issuerScope';

interface Establishment {
  id: string;
  name: string;
  trade_name: string | null;
  category: string | null;
  accepted_categories: string[] | null;
}

interface Voucher {
  id: string;
  remaining_value: number;
  value: number;
  expiration_date: string;
  rules: Record<string, string>;
  status: string;
  issuer_id: string;
}

interface Slice {
  voucher: Voucher;
  amount: number;
}

type Step = 'establishment' | 'amount' | 'review' | 'success';

interface Charge {
  id: string;
  establishment_id: string;
  amount: number;
  description: string | null;
  status: string;
}

export default function UsarVoucher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const scope = useIssuerScope();

  const hasChargeId = Boolean((location.state as { chargeId?: string } | null)?.chargeId);
  const [step, setStep] = useState<Step>(hasChargeId ? 'review' : 'establishment');
  const [loading, setLoading] = useState(false);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [search, setSearch] = useState('');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [amount, setAmount] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [manualSlices, setManualSlices] = useState<Record<string, number> | null>(null);
  const [finalSlices, setFinalSlices] = useState<Slice[]>([]);
  const [charge, setCharge] = useState<Charge | null>(null);

  // Load establishments + active vouchers
  useEffect(() => {
    if (!user) return;
    supabase.from('establishments').select('id, name, trade_name, category, accepted_categories').eq('status', 'active').then(({ data }) => {
      setEstablishments((data as Establishment[]) ?? []);
    });
    supabase.from('vouchers').select('id, value, remaining_value, expiration_date, rules, status, issuer_id')
      .eq('beneficiary_id', user.id).in('status', ['active', 'partially_used'])
      .then(({ data }) => setVouchers((data as Voucher[]) ?? []));
  }, [user]);

  // If a chargeId was passed (QR Code), load charge + establishment and jump to review
  useEffect(() => {
    const chargeId = location.state?.chargeId as string | undefined;
    if (!chargeId || charge || establishments.length === 0) return;
    (async () => {
      const { data: ch } = await supabase
        .from('charges')
        .select('id, establishment_id, amount, description, status')
        .eq('id', chargeId)
        .maybeSingle();
      if (!ch) { toast.error('Cobrança não encontrada'); return; }
      if (ch.status !== 'pending') { toast.error('Esta cobrança já foi paga'); return; }
      const est = establishments.find(e => e.id === ch.establishment_id) ?? null;
      if (!est) { toast.error('Estabelecimento da cobrança não encontrado'); return; }
      setCharge(ch as Charge);
      setEstablishment(est);
      setAmount(String(ch.amount).replace('.', ','));
      setStep('review');
    })();
  }, [location.state, establishments, charge]);

  const valueNumber = parseFloat(amount.replace(',', '.')) || 0;

  // Eligible vouchers for chosen establishment + scope
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const notExpired = (v: Voucher) => new Date(v.expiration_date) >= today;

  const eligibleVouchers = useMemo(() => {
    if (!establishment) return [];
    const accepted = establishment.accepted_categories ?? [];
    return vouchers
      .filter(v => Number(v.remaining_value) > 0)
      .filter(notExpired)
      .filter(v => scope.matches(v.issuer_id))
      .filter(v => accepted.length === 0 || accepted.includes(v.rules?.category))
      .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime());
  }, [vouchers, establishment, scope]);

  const ineligibleVouchers = useMemo(() => {
    if (!establishment) return [];
    const accepted = establishment.accepted_categories ?? [];
    return vouchers
      .filter(v => Number(v.remaining_value) > 0)
      .filter(notExpired)
      .filter(v => scope.matches(v.issuer_id))
      .filter(v => accepted.length > 0 && !accepted.includes(v.rules?.category));
  }, [vouchers, establishment, scope]);

  const eligibleTotal = eligibleVouchers.reduce((s, v) => s + Number(v.remaining_value), 0);

  // Auto allocation (FIFO by expiration)
  const autoSlices = useMemo<Slice[]>(() => {
    let left = valueNumber;
    const out: Slice[] = [];
    for (const v of eligibleVouchers) {
      if (left <= 0) break;
      const take = Math.min(Number(v.remaining_value), left);
      if (take > 0) {
        out.push({ voucher: v, amount: Number(take.toFixed(2)) });
        left = +(left - take).toFixed(2);
      }
    }
    return out;
  }, [eligibleVouchers, valueNumber]);

  const slices = useMemo<Slice[]>(() => {
    if (!manualSlices) return autoSlices;
    const out: Slice[] = [];
    for (const v of eligibleVouchers) {
      const a = manualSlices[v.id];
      if (a && a > 0) out.push({ voucher: v, amount: Number(a.toFixed(2)) });
    }
    return out;
  }, [autoSlices, manualSlices, eligibleVouchers]);

  const slicesTotal = slices.reduce((s, x) => s + x.amount, 0);
  const slicesCovered = Math.abs(slicesTotal - valueNumber) < 0.01;

  const filteredEstablishments = establishments.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (e.name || '').toLowerCase().includes(q) || (e.trade_name || '').toLowerCase().includes(q);
  });

  const handleConfirm = async () => {
    if (!establishment || !slicesCovered) return;
    setLoading(true);
    setFinalSlices(slices);

    try {
      const { data, error } = await supabase.rpc('pay_payment', {
        _establishment_id: establishment.id,
        _amount: valueNumber,
        _slices: slices.map(s => ({ voucher_id: s.voucher.id, amount: s.amount })),
        _charge_id: charge?.id ?? null,
      });
      if (error) throw error;

      const txIds = ((data as { transaction_ids?: string[] } | null)?.transaction_ids) ?? [];
      for (let i = 0; i < txIds.length; i++) {
        const txId = txIds[i];
        const s = slices[i];
        if (!txId || !s) continue;
        const settlement = await mockBlockchainSettle(txId, s.amount);
        await supabase.from('transactions').update({ transfero_tx_id: settlement.tx_id }).eq('id', txId);
        await addAuditLog('voucher_used', 'voucher', s.voucher.id, {
          amount: s.amount, establishment: establishment.id,
        });
        // Register on Stellar Testnet
        const r = await registerOnStellar({
          internal_id: txId,
          entity_type: 'transaction',
          operation: 'pay_voucher',
          amount: s.amount,
          issuer_id: s.voucher.issuer_id,
        });
        if (r.success && r.hash) {
          toast.success(`Pagamento registrado na Stellar (${r.hash.slice(0, 8)}…)`);
        }
        // Fire-and-forget off-ramp: queima TESOURO da carteira do emissor e
        // dispara PIX em BRL para a chave default do lojista.
        supabase.functions.invoke('etherfuse-create-offramp', {
          body: { transaction_id: txId },
        }).catch(err => console.error('offramp invoke', err));
      }

      setStep('success');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 bg-[#F0F2F5]">
      <AppHeader variant="navy" />
      <main className="max-w-md mx-auto px-5 py-6 space-y-4">

        {/* ───────── STEP: Establishment ───────── */}
        {step === 'establishment' && (
          <>
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs font-bold text-tikin-navy/60 mb-1">
              <ArrowLeft size={14} /> VOLTAR
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/40">Passo 1 de 3</p>
              <h1 className="font-heading text-2xl font-black text-tikin-navy">Selecione o lojista</h1>
              <p className="text-xs text-tikin-navy/60 mt-1">Escolha onde você vai pagar.</p>
            </div>

            <div className="bg-white rounded-2xl p-3 shadow-card">
              <div className="flex items-center gap-2 px-2">
                <Search size={14} className="text-tikin-navy/40" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome do estabelecimento"
                  className="flex-1 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredEstablishments.length === 0 && (
                <div className="bg-white rounded-2xl p-6 text-center text-sm text-tikin-navy/50">
                  Nenhum estabelecimento encontrado.
                </div>
              )}
              {filteredEstablishments.map(e => (
                <button
                  key={e.id}
                  onClick={() => { setEstablishment(e); setStep('amount'); }}
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 text-left shadow-card hover:shadow-elevated transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-tikin-orange/10 text-tikin-orange flex items-center justify-center shrink-0">
                    <Store size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-extrabold text-tikin-navy text-sm truncate">{e.name}</p>
                    <p className="text-[11px] text-tikin-navy/50 truncate">
                      {(e.accepted_categories ?? []).length > 0
                        ? (e.accepted_categories ?? []).map(c => categoryLabel(c)).join(' · ')
                        : 'Aceita todas as categorias'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-tikin-navy/30 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ───────── STEP: Amount ───────── */}
        {step === 'amount' && establishment && (
          <>
            <button onClick={() => { setStep('establishment'); setEstablishment(null); }} className="flex items-center gap-1 text-xs font-bold text-tikin-navy/60 mb-1">
              <ArrowLeft size={14} /> VOLTAR
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/40">Passo 2 de 3</p>
              <h1 className="font-heading text-2xl font-black text-tikin-navy">Quanto pagar?</h1>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tikin-orange/10 text-tikin-orange flex items-center justify-center shrink-0">
                <Store size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-extrabold text-tikin-navy text-sm truncate">{establishment.name}</p>
                <p className="text-[11px] text-tikin-navy/50 truncate">
                  {(establishment.accepted_categories ?? []).map(c => categoryLabel(c)).join(' · ') || 'Aceita todas as categorias'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-card">
              <label className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/40">Valor da cobrança</label>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-heading text-2xl font-black text-tikin-navy/60">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^\d,.]/g, ''))}
                  placeholder="0,00"
                  className="flex-1 font-heading text-4xl font-black text-tikin-navy outline-none bg-transparent w-full"
                />
              </div>
              <p className="text-[11px] text-tikin-navy/40 mt-3">
                Saldo elegível para este lojista: R$ {eligibleTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <button
              onClick={() => { setManualSlices(null); setEditMode(false); setStep('review'); }}
              disabled={valueNumber <= 0 || valueNumber > eligibleTotal}
              className="w-full py-4 bg-tikin-orange text-white rounded-2xl font-heading font-extrabold text-sm shadow-orange disabled:opacity-40 disabled:shadow-none"
            >
              {valueNumber > eligibleTotal ? 'SALDO INSUFICIENTE' : 'CONTINUAR'}
            </button>
          </>
        )}

        {/* Loader while resolving QR Code charge */}
        {step === 'review' && !establishment && hasChargeId && (
          <div className="bg-white rounded-2xl p-10 shadow-card flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-tikin-orange" />
            <p className="text-xs text-tikin-navy/60 font-bold">Carregando cobrança...</p>
          </div>
        )}

        {/* ───────── STEP: Review ───────── */}
        {step === 'review' && establishment && (
          <>
            <button
              onClick={() => charge ? navigate('/beneficiario/pagar') : setStep('amount')}
              className="flex items-center gap-1 text-xs font-bold text-tikin-navy/60 mb-1"
            >
              <ArrowLeft size={14} /> VOLTAR
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/40">
                {charge ? 'Cobrança recebida via QR Code' : 'Passo 3 de 3'}
              </p>
              <h1 className="font-heading text-2xl font-black text-tikin-navy">Revise e confirme</h1>
            </div>

            {/* Summary */}
            <div className="bg-tikin-navy text-white rounded-2xl p-5 shadow-elevated">
              <p className="text-white/60 text-[11px] uppercase tracking-wider font-bold">Você vai pagar</p>
              <p className="font-heading text-4xl font-black mt-1">
                R$ {valueNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="h-px bg-white/10 my-3" />
              <div className="flex items-center gap-2">
                <Store size={14} className="text-tikin-orange" />
                <p className="text-sm font-bold">{establishment.name}</p>
              </div>
              {charge?.description && (
                <p className="text-xs text-white/60 mt-2">{charge.description}</p>
              )}
            </div>

            {/* Slice breakdown */}
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4">
                <p className="font-heading font-extrabold text-tikin-navy text-sm">
                  {editMode ? 'Distribuir entre vouchers' : `Vouchers selecionados (${slices.length})`}
                </p>
                <button
                  onClick={() => {
                    if (!editMode) {
                      // seed from auto
                      const seed: Record<string, number> = {};
                      autoSlices.forEach(s => { seed[s.voucher.id] = s.amount; });
                      setManualSlices(seed);
                    } else {
                      setManualSlices(null);
                    }
                    setEditMode(e => !e);
                  }}
                  className="flex items-center gap-1 text-[11px] font-extrabold text-tikin-orange"
                >
                  <Pencil size={11} /> {editMode ? 'USAR SUGESTÃO' : 'TROCAR'}
                </button>
              </div>

              {!editMode && (
                <p className="text-[11px] text-tikin-navy/50 px-4 mt-1">
                  Selecionados automaticamente pelos que vencem antes.
                </p>
              )}

              <div className="divide-y divide-tikin-navy/5 mt-3">
                {(editMode ? eligibleVouchers : slices.map(s => s.voucher)).map(v => {
                  const sliceAmount = editMode
                    ? (manualSlices?.[v.id] ?? 0)
                    : (slices.find(s => s.voucher.id === v.id)?.amount ?? 0);
                  const daysLeft = differenceInDays(new Date(v.expiration_date), new Date());
                  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30;
                  return (
                    <div key={v.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-heading font-extrabold text-tikin-navy text-sm">
                            {categoryLabel(v.rules?.category) || 'Geral'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <IssuerBadge issuerId={v.issuer_id} />
                            {isExpiringSoon && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive">
                                <AlertTriangle size={9} /> Vence em {daysLeft}d
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-tikin-navy/50 mt-1">
                            Saldo R$ {Number(v.remaining_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {' · '}Válido até {format(new Date(v.expiration_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {!editMode ? (
                            <p className="font-heading font-black text-tikin-orange">
                              − R$ {sliceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={sliceAmount > 0 ? sliceAmount.toString().replace('.', ',') : ''}
                              onChange={e => {
                                const raw = e.target.value.replace(/[^\d,.]/g, '').replace(',', '.');
                                const n = Math.min(parseFloat(raw) || 0, Number(v.remaining_value));
                                setManualSlices(prev => ({ ...(prev ?? {}), [v.id]: n }));
                              }}
                              placeholder="0,00"
                              className="w-24 text-right font-heading font-black text-tikin-navy outline-none border-b border-tikin-navy/10 focus:border-tikin-orange"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {editMode && (
                <div className="px-4 pb-4">
                  <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-between ${
                    slicesCovered ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  }`}>
                    <span>Total distribuído</span>
                    <span>R$ {slicesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {valueNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ineligible info */}
            {ineligibleVouchers.length > 0 && (
              <details className="bg-white rounded-2xl shadow-card">
                <summary className="cursor-pointer px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-tikin-navy/50 select-none">
                  {ineligibleVouchers.length} voucher(s) não aceito(s) por este lojista
                </summary>
                <div className="px-4 pb-4 space-y-1.5">
                  {ineligibleVouchers.map(v => (
                    <div key={v.id} className="flex items-center justify-between text-[11px] text-tikin-navy/50">
                      <span className="flex items-center gap-2">
                        {categoryLabel(v.rules?.category) || 'Geral'}
                        <IssuerBadge issuerId={v.issuer_id} />
                      </span>
                      <span>R$ {Number(v.remaining_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <button
              onClick={handleConfirm}
              disabled={loading || !slicesCovered}
              className="w-full py-5 bg-tikin-orange text-white rounded-2xl font-heading font-extrabold text-base shadow-orange disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {slicesCovered ? 'CONFIRMAR PAGAMENTO' : 'AJUSTE O VALOR DOS VOUCHERS'}
            </button>
          </>
        )}

        {/* ───────── STEP: Success ───────── */}
        {step === 'success' && establishment && (
          <div className="bg-white rounded-2xl shadow-elevated p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 text-success flex items-center justify-center">
              <Check size={32} />
            </div>
            <h2 className="font-heading text-xl font-black text-tikin-navy mt-4">Pagamento realizado!</h2>
            <p className="text-xs text-tikin-navy/50 mt-1">Liquidação instantânea via Blockchain</p>

            <p className="font-heading text-4xl font-black text-tikin-orange mt-5">
              R$ {valueNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-tikin-navy/50 mt-1">em {establishment.name}</p>

            <div className="bg-[#F7F8FA] rounded-xl p-3 mt-5 text-left space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/40">Vouchers utilizados</p>
              {finalSlices.map(s => (
                <div key={s.voucher.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-tikin-navy font-bold">
                    {categoryLabel(s.voucher.rules?.category) || 'Geral'}
                    <IssuerBadge issuerId={s.voucher.issuer_id} />
                  </span>
                  <span className="font-heading font-black text-tikin-navy">− R$ {s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/beneficiario')}
              className="w-full mt-6 py-4 bg-tikin-navy text-white rounded-2xl font-heading font-extrabold text-sm"
            >
              VOLTAR PARA O INÍCIO
            </button>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
