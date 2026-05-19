import { useEffect, useRef, useState } from 'react';
import { Loader2, X, Copy, CheckCircle2, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { createOnrampOrder, getOrderStatus, ensureEtherfuseCustomer, type OnrampOrder } from '@/lib/etherfuse';
import { fmtBRL } from '@/lib/utils';
import { StellarHashLink } from '@/components/StellarHashLink';

interface Props {
  amountBRL: number;
  issuerFundsId: string;
  onClose: () => void;
  onPaid: (order: OnrampOrder) => void;
}

export function EtherfusePixModal({ amountBRL, issuerFundsId, onClose, onPaid }: Props) {
  const [order, setOrder] = useState<OnrampOrder | null>(null);
  const [phase, setPhase] = useState<'init' | 'kyc' | 'pix' | 'paid' | 'error'>('init');
  const [kycUrl, setKycUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [secsLeft, setSecsLeft] = useState<number>(0);
  const [simulating, setSimulating] = useState(false);
  const initStartedRef = useRef(false);
  const simulatingRef = useRef(false);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const cust = await ensureEtherfuseCustomer();
        if (cancelled) return;
        if (cust.kyc_status !== 'approved') {
          setKycUrl(cust.kyc_url);
          setPhase('kyc');
          return;
        }
        const ord = await createOnrampOrder(amountBRL, issuerFundsId);
        if (cancelled) return;
        setOrder(ord);
        setPhase('pix');
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || String(e));
        setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [amountBRL, issuerFundsId]);

  // Polling
  useEffect(() => {
    if (phase !== 'pix' || !order) return;
    const iv = setInterval(async () => {
      try {
        const upd = await getOrderStatus(order.id);
        setOrder(upd);
        if (upd.status === 'paid') {
          setPhase('paid');
          onPaid(upd);
          clearInterval(iv);
        } else if (upd.status === 'expired' || upd.status === 'failed') {
          setError(`Cobrança ${upd.status === 'expired' ? 'expirada' : 'falhou'}`);
          setPhase('error');
          clearInterval(iv);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [phase, order?.id]);

  // Countdown
  useEffect(() => {
    if (!order?.expires_at) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(order.expires_at!).getTime() - Date.now()) / 1000));
      setSecsLeft(left);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [order?.expires_at]);

  async function simulatePayment() {
    if (!order || simulatingRef.current) return;
    simulatingRef.current = true;
    setSimulating(true);
    try {
      const upd = await getOrderStatus(order.id, 'pay');
      setOrder(upd);
      if (upd.status === 'paid') {
        setPhase('paid');
        toast.success('Pagamento PIX simulado com sucesso');
        onPaid(upd);
      } else {
        toast.warning('Simulação enviada, aguardando confirmação');
      }
    } catch (e: any) { toast.error(e.message); }
    finally { simulatingRef.current = false; setSimulating(false); }
  }

  function copyPix() {
    if (!order?.pix_copy_paste) return;
    navigator.clipboard.writeText(order.pix_copy_paste);
    toast.success('Código PIX copiado');
  }

  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F1729] border border-white/10 rounded-3xl w-full max-w-lg p-7 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-tikin-orange font-heading font-black">Etherfuse · BRL → TESOURO</p>
            <h2 className="font-heading font-black text-lg mt-1">Aporte via PIX</h2>
            <p className="text-xs text-white/40 mt-1">O orçamento será liberado após a confirmação do PIX na carteira Stellar.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"><X size={16} /></button>
        </div>

        {phase === 'init' && (
          <div className="py-12 flex flex-col items-center gap-3 text-white/60">
            <Loader2 className="animate-spin text-tikin-orange" size={28} />
            <p className="text-xs">Preparando ordem on-ramp…</p>
          </div>
        )}

        {phase === 'kyc' && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">Para movimentar BRL ↔ TESOURO via PIX é necessário concluir o KYC da Etherfuse. Isto leva poucos minutos e só é feito uma vez.</p>
            <a href={kycUrl} target="_blank" rel="noreferrer" className="block w-full py-3 bg-tikin-orange rounded-xl font-heading font-black text-center text-sm">ABRIR KYC ETHERFUSE</a>
            <button onClick={() => window.location.reload()} className="block w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold">JÁ CONCLUÍ — REVALIDAR</button>
          </div>
        )}

        {phase === 'pix' && order && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-[10px] uppercase text-white/40 font-bold tracking-widest">Valor</p>
              <p className="font-heading font-black text-3xl mt-1">R$ {fmtBRL(Number(order.amount_brl))}</p>
              <p className="text-[11px] text-white/40 mt-1 flex items-center justify-center gap-1.5"><Clock size={11} /> Expira em {mm}:{ss}</p>
            </div>

            {order.pix_qr && (
              <div className="bg-white p-3 rounded-xl flex items-center justify-center">
                <img src={order.pix_qr} alt="QR PIX" className="w-56 h-56" />
              </div>
            )}

            <div>
              <p className="text-[10px] uppercase text-white/40 font-bold tracking-widest mb-1">PIX copia e cola</p>
              <div className="flex gap-2">
                <input readOnly value={order.pix_copy_paste || ''} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white/80" />
                <button onClick={copyPix} className="px-3 rounded-lg bg-tikin-orange text-xs font-heading font-black flex items-center gap-1"><Copy size={12} /> COPIAR</button>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-start gap-2">
              <Loader2 className="text-tikin-orange animate-spin mt-0.5 shrink-0" size={14} />
              <p className="text-[11px] text-white/60">Aguardando confirmação do PIX… o status atualiza automaticamente a cada 5s.</p>
            </div>

            <button onClick={simulatePayment} disabled={simulating} className="w-full py-2.5 rounded-xl border border-tikin-orange/40 bg-tikin-orange/10 hover:bg-tikin-orange/20 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-heading font-black text-tikin-orange flex items-center justify-center gap-2">
              {simulating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} {simulating ? 'SIMULANDO…' : 'SIMULAR PAGAMENTO (DEMO SANDBOX)'}
            </button>
          </div>
        )}

        {phase === 'paid' && order && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="text-green-400 mx-auto" size={48} />
            <h3 className="font-heading font-black text-lg">PIX confirmado</h3>
            <p className="text-sm text-white/60">R$ {fmtBRL(Number(order.amount_brl))} convertido em TESOURO na carteira Stellar do emissor.</p>
            {order.stellar_tx_hash && (
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                <p className="text-[10px] uppercase text-white/40 font-bold tracking-widest mb-1">Registro na blockchain</p>
                <StellarHashLink hash={order.stellar_tx_hash} />
              </div>
            )}
            <button onClick={onClose} className="w-full py-3 bg-tikin-orange rounded-xl font-heading font-black">FECHAR</button>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold">FECHAR</button>
          </div>
        )}
      </div>
    </div>
  );
}
