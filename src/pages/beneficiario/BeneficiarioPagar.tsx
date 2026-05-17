import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MobileNav } from '@/components/layout/MobileNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BeneficiarioPagar() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const resolveAndGo = async (charge: { id: string } | null) => {
    if (!charge) return toast.error('Cobrança não encontrada');
    navigate('/beneficiario/usar-voucher', { state: { chargeId: charge.id } });
  };

  const handlePay = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return toast.error('Digite o código da cobrança');
    setLoading(true);
    // Match by full uuid or 8-char prefix
    const { data } = await supabase
      .from('charges')
      .select('id, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setLoading(false);
    const found = (data ?? []).find(
      ch => ch.id === code.trim() || ch.id.slice(0, 8).toUpperCase() === c
    );
    resolveAndGo(found ?? null);
  };

  const handleScan = async () => {
    setLoading(true);
    // Mock scan: take the most recent pending charge
    const { data } = await supabase
      .from('charges')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLoading(false);
    if (!data) return toast.error('Nenhuma cobrança disponível para simular');
    resolveAndGo(data);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-28">
      <AppHeader variant="navy" />
      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        <button onClick={handleScan} disabled={loading} className="w-full bg-white rounded-2xl p-10 text-center shadow-card disabled:opacity-60">
          <div className="w-44 h-44 mx-auto border-4 border-dashed border-tikin-orange rounded-2xl flex flex-col items-center justify-center text-tikin-orange gap-3">
            {loading ? <Loader2 size={48} className="animate-spin" /> : <QrCode size={48} />}
            <p className="font-heading font-extrabold text-xs">Apontar câmera</p>
          </div>
          <p className="text-tikin-navy font-extrabold mt-5">Escaneie o QR Code do lojista</p>
          <p className="text-xs text-tikin-navy/50 mt-1">O valor e o estabelecimento são identificados automaticamente.</p>
        </button>

        <div className="bg-white rounded-2xl p-5 shadow-card">
          <p className="font-heading font-extrabold text-tikin-navy text-sm mb-3">Ou digite o código</p>
          <div className="flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value)}
              placeholder="Ex: A1B2C3D4"
              className="flex-1 px-4 py-3 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-sm outline-none focus:border-tikin-orange font-mono uppercase tracking-widest" />
            <button onClick={handlePay} disabled={loading}
              className="px-5 bg-tikin-orange text-white rounded-xl font-heading font-extrabold text-sm disabled:opacity-60">PAGAR</button>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
