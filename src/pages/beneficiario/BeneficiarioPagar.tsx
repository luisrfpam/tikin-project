import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MobileNav } from '@/components/layout/MobileNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { QrCode, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
};

export default function BeneficiarioPagar() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const stopScanner = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerOpen(false);
  };

  useEffect(() => () => stopScanner(), []);

  const parseChargeToken = (raw: string) => {
    const value = raw.trim();
    if (!value) return '';
    if (value.toLowerCase().startsWith('tikin:charge:')) {
      return value.slice('tikin:charge:'.length).trim();
    }
    return value;
  };

  const resolveAndGo = async (charge: { id: string } | null) => {
    if (!charge) return toast.error('Cobrança não encontrada');
    navigate('/beneficiario/usar-voucher', { state: { chargeId: charge.id } });
  };

  const resolveChargeByToken = async (token: string) => {
    const normalized = parseChargeToken(token);
    const fullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (fullUuid.test(normalized)) {
      const { data } = await supabase
        .from('charges')
        .select('id, status')
        .eq('id', normalized)
        .eq('status', 'pending')
        .maybeSingle();
      return data ?? null;
    }

    const c = normalized.toUpperCase();
    const { data } = await supabase
      .from('charges')
      .select('id, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return (data ?? []).find(
      ch => ch.id === normalized || ch.id.slice(0, 8).toUpperCase() === c
    ) ?? null;
  };

  const handlePay = async () => {
    const token = code.trim();
    if (!token) return toast.error('Digite o código da cobrança');
    setLoading(true);
    const found = await resolveChargeByToken(token);
    setLoading(false);
    resolveAndGo(found ?? null);
  };

  const handleScan = async () => {
    const win = window as WindowWithBarcodeDetector;
    if (!win.BarcodeDetector) {
      setScannerSupported(false);
      toast.error('Leitura por câmera não suportada neste navegador. Digite o código manualmente.');
      return;
    }

    try {
      setCameraStarting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;
      setScannerSupported(true);
      setScannerOpen(true);

      setTimeout(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play().catch(() => {});
      }, 0);
    } catch {
      toast.error('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
    } finally {
      setCameraStarting(false);
    }
  };

  useEffect(() => {
    if (!scannerOpen) return;
    const win = window as WindowWithBarcodeDetector;
    if (!win.BarcodeDetector || !videoRef.current) return;

    const detector = new win.BarcodeDetector({ formats: ['qr_code'] });
    scanningRef.current = true;

    const scanLoop = async () => {
      if (!scanningRef.current || !videoRef.current) return;

      try {
        const result = await detector.detect(videoRef.current);
        const raw = result?.[0]?.rawValue?.trim();
        if (raw) {
          scanningRef.current = false;
          setLoading(true);
          const found = await resolveChargeByToken(raw);
          setLoading(false);
          stopScanner();

          if (!found) {
            toast.error('QR Code inválido ou cobrança indisponível');
            return;
          }
          resolveAndGo(found);
          return;
        }
      } catch {
        // Keep trying while scanner is active.
      }

      if (scanningRef.current) requestAnimationFrame(scanLoop);
    };

    requestAnimationFrame(scanLoop);

    return () => {
      scanningRef.current = false;
    };
  }, [scannerOpen]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-28">
      <AppHeader variant="navy" />
      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        <button onClick={handleScan} disabled={loading || cameraStarting} className="w-full bg-white rounded-2xl p-10 text-center shadow-card disabled:opacity-60">
          <div className="w-44 h-44 mx-auto border-4 border-dashed border-tikin-orange rounded-2xl flex flex-col items-center justify-center text-tikin-orange gap-3">
            {loading || cameraStarting ? <Loader2 size={48} className="animate-spin" /> : <QrCode size={48} />}
            <p className="font-heading font-extrabold text-xs">Apontar câmera</p>
          </div>
          <p className="text-tikin-navy font-extrabold mt-5">Escaneie o QR Code do lojista</p>
          <p className="text-xs text-tikin-navy/50 mt-1">
            {scannerSupported
              ? 'O valor e o estabelecimento são identificados automaticamente.'
              : 'Seu navegador não suporta leitura por câmera. Use o código manual.'}
          </p>
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

      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 px-4 py-6 flex flex-col">
          <div className="w-full max-w-md mx-auto flex items-center justify-between text-white mb-4">
            <div>
              <p className="font-heading font-extrabold text-sm">Aponte para o QR Code</p>
              <p className="text-xs text-white/70">A leitura acontece automaticamente.</p>
            </div>
            <button onClick={stopScanner} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <X size={18} />
            </button>
          </div>

          <div className="w-full max-w-md mx-auto flex-1 rounded-3xl overflow-hidden border border-white/20 bg-black relative">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-tikin-orange rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}
