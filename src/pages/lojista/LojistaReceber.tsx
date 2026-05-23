import { brl } from '@/lib/format';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MobileNav } from '@/components/layout/MobileNav';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Check, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { registerOnStellar } from '@/lib/stellar';

export default function LojistaReceber() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [establishmentId, setEstablishmentId] = useState('');
  const [hasDefaultPix, setHasDefaultPix] = useState(false);
  const [checkingPixConfig, setCheckingPixConfig] = useState(true);
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');

  const amountDisplay = `R$ ${brl(amountCents / 100)}`;
  const handleAmountChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11); // até 999.999.999,99
    setAmountCents(digits ? parseInt(digits, 10) : 0);
  };
  const [phase, setPhase] = useState<'form' | 'qr' | 'received'>('form');
  const [waiting, setWaiting] = useState(false);
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [inferredIssuerId, setInferredIssuerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('establishments').select('id').eq('user_id', user.id).single()
      .then(async ({ data }) => {
        if (!data) {
          setCheckingPixConfig(false);
          return;
        }
        setEstablishmentId(data.id);
        const { count } = await supabase
          .from('merchant_pix_keys')
          .select('id', { count: 'exact', head: true })
          .eq('establishment_id', data.id)
          .eq('is_default', true);
        setHasDefaultPix((count ?? 0) > 0);
        setCheckingPixConfig(false);

        // Try to infer a single issuer context for this merchant from prior paid transactions.
        // If there is exactly one issuer, charge registration can already appear in issuer history at QR creation.
        const { data: txRows } = await supabase
          .from('transactions')
          .select('vouchers(issuer_id)')
          .eq('establishment_id', data.id)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })
          .limit(200);

        const issuerIds = new Set<string>();
        for (const row of (txRows as any[]) ?? []) {
          const issuerId = row?.vouchers?.issuer_id;
          if (issuerId) issuerIds.add(issuerId);
          if (issuerIds.size > 1) break;
        }
        setInferredIssuerId(issuerIds.size === 1 ? Array.from(issuerIds)[0] : null);
      });
  }, [user]);

  // Poll the charge until paid (so the lojista can show "received" automatically)
  useEffect(() => {
    if (phase !== 'qr' || !chargeId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('charges').select('status').eq('id', chargeId).single();
      if (data?.status === 'paid') {
        clearInterval(interval);
        setPhase('received');
        toast.success('Pagamento recebido! Liquidação instantânea.');
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [phase, chargeId]);

  const generateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkingPixConfig) return;
    if (!hasDefaultPix) {
      toast.warning('Cadastre e defina uma chave PIX padrão em Perfil > PIX para cobrar e gerar QR Code.');
      return;
    }
    const v = amountCents / 100;
    if (!v || v <= 0) return toast.error('Informe um valor válido');
    if (!establishmentId) return toast.error('Estabelecimento não encontrado');
    setGenerating(true);
    const { data, error } = await supabase.from('charges').insert([{
      establishment_id: establishmentId,
      amount: v,
      description: description || null,
      status: 'pending',
    }]).select('id').single();
    setGenerating(false);
    if (error || !data) return toast.error(error?.message || 'Erro ao gerar cobrança');
    setChargeId(data.id);
    setPhase('qr');
    // Register charge on Stellar Testnet. If issuer context is unambiguous, include it now
    // so the event is immediately visible on issuer blockchain history.
    registerOnStellar({
      internal_id: data.id,
      entity_type: 'charge',
      operation: 'charge',
      amount: v,
      issuer_id: inferredIssuerId || undefined,
    })
      .then(r => { if (r.success && r.hash) toast.success(`Cobrança registrada na Stellar (${r.hash.slice(0, 8)}…)`); });
  };

  const simulateReceive = async () => {
    if (!chargeId) return;
    setWaiting(true);
    // Mark charge as paid — simulating the beneficiary scan + confirm
    await supabase.from('charges').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', chargeId);
    setWaiting(false);
    setPhase('received');
    toast.success('Pagamento recebido! Liquidação instantânea.');
  };

  const reset = () => { setAmountCents(0); setDescription(''); setPhase('form'); setChargeId(null); };

  const qrValue = chargeId ? `tikin:charge:${chargeId}` : '';

  return (
    <div className="min-h-screen bg-[#FFFAF5] pb-28">
      <nav className="bg-tikin-orange px-6 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 max-w-md mx-auto">
          <button onClick={() => navigate('/lojista')} className="text-white"><ArrowLeft size={22} /></button>
          <img src="/logo-fundo-branco.webp" alt="TIKIN" className="h-6" />
          <button onClick={signOut} className="text-white/70 text-xs font-extrabold">SAIR</button>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-5 py-6">
        {phase === 'form' && (
          <form onSubmit={generateQR} className="bg-white rounded-3xl p-6 shadow-card space-y-5">
            <div>
              <h1 className="font-heading font-black text-2xl text-tikin-navy">Cobrar agora</h1>
              <p className="text-xs text-tikin-navy/50 mt-1">Gere um QR Code para o cliente pagar pelo app.</p>
            </div>

            {!checkingPixConfig && !hasDefaultPix && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                Para gerar cobrança, cadastre ao menos 1 chave PIX e marque uma como padrão em Perfil &gt; PIX.
              </div>
            )}

            <div>
              <label className="text-[10px] font-extrabold text-tikin-navy/50 uppercase tracking-wider">Valor da cobrança (R$)</label>
              <input
                inputMode="numeric"
                value={amountDisplay}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="R$ 0,00"
                required
                className="w-full mt-2 px-4 py-4 rounded-2xl border border-tikin-navy/10 bg-[#F7F8FA] text-center font-heading font-black text-3xl text-tikin-navy"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-tikin-navy/50 uppercase tracking-wider">Descrição (opcional)</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Almoço executivo"
                maxLength={120}
                className="w-full mt-2 px-4 py-3 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-sm"
              />
            </div>

            <button type="submit" disabled={generating || checkingPixConfig || !hasDefaultPix}
              className="w-full bg-tikin-orange text-white py-4 rounded-2xl font-heading font-extrabold flex items-center justify-center gap-2 shadow-orange disabled:opacity-60">
              {generating ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={20} />}
              {checkingPixConfig ? 'VERIFICANDO...' : generating ? 'GERANDO...' : 'GERAR QR CODE'}
            </button>
          </form>
        )}

        {phase === 'qr' && (
          <div className="bg-white rounded-3xl p-6 shadow-card text-center space-y-4">
            <p className="text-[10px] font-extrabold text-tikin-navy/40 uppercase tracking-widest">Cobrança gerada</p>
            <p className="font-heading font-black text-3xl text-tikin-navy">
              R$ {brl(amountCents / 100)}
            </p>
            {description && <p className="text-sm text-tikin-navy/60 -mt-2">{description}</p>}
            <div className="inline-block p-4 rounded-2xl border-4 border-tikin-orange/20">
              <QRCodeSVG value={qrValue} size={200} />
            </div>
            <p className="text-xs text-tikin-navy/50">Apresente ao beneficiário para efetuar o pagamento</p>
            {chargeId && (
              <div className="bg-[#F7F8FA] rounded-xl px-3 py-2 inline-block">
                <p className="text-[10px] uppercase tracking-wider font-bold text-tikin-navy/40">Código</p>
                <p className="font-mono font-extrabold text-tikin-navy tracking-widest">{chargeId.slice(0, 8).toUpperCase()}</p>
              </div>
            )}
            <button onClick={reset} className="w-full py-3 text-tikin-navy/60 text-sm font-bold">Cancelar</button>
          </div>
        )}

        {phase === 'received' && (
          <div className="bg-white rounded-3xl p-8 shadow-card text-center space-y-4 animate-fade-in">
            <div className="mx-auto h-20 w-20 rounded-full bg-success flex items-center justify-center">
              <Check className="text-white" size={40} />
            </div>
            <h2 className="font-heading font-black text-2xl text-tikin-navy">Pagamento recebido!</h2>
            <p className="text-tikin-navy/60">R$ {brl(amountCents / 100)} liquidado instantaneamente.</p>
            <button onClick={reset} className="w-full bg-tikin-orange text-white py-3 rounded-xl font-heading font-extrabold">
              NOVA COBRANÇA
            </button>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
