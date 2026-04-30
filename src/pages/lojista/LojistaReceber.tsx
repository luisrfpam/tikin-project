import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LojistaReceber() {
  const { user } = useAuth();
  const [establishmentId, setEstablishmentId] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [received, setReceived] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('establishments').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setEstablishmentId(data.id);
    });
  }, [user]);

  const simulateReceive = () => {
    setWaiting(true);
    setTimeout(() => {
      setWaiting(false);
      setReceived(true);
      toast.success('Pagamento recebido! Liquidação instantânea.');
    }, 2000);
  };

  if (received) {
    return (
      <div className="min-h-screen pb-20">
        <AppHeader />
        <main className="container flex max-w-lg flex-col items-center py-20">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success animate-slide-up">
            <Check className="h-10 w-10 text-success-foreground" />
          </div>
          <h2 className="mb-2 font-heading text-2xl font-bold">Pagamento Recebido!</h2>
          <p className="mb-6 text-muted-foreground">Liquidação instantânea creditada</p>
          <Button onClick={() => { setReceived(false); setWaiting(false); }}>
            Receber outro pagamento
          </Button>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <AppHeader />
      <main className="container max-w-lg py-6">
        <h1 className="mb-6 font-heading text-2xl font-bold">Receber Pagamento</h1>
        <Card className="shadow-elevated animate-fade-in">
          <CardContent className="flex flex-col items-center py-8">
            {establishmentId ? (
              <>
                <div className="mb-4 rounded-xl border-4 border-primary/20 p-4">
                  <QRCodeSVG value={`tikin:establishment:${establishmentId}`} size={200} />
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Mostre este QR Code ao Beneficiário
                </p>
                <p className="mb-6 text-xs text-muted-foreground/60">
                  ID: {establishmentId.slice(0, 8)}...
                </p>
                <Button onClick={simulateReceive} disabled={waiting} className="bg-gradient-primary">
                  {waiting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {waiting ? 'Aguardando pagamento...' : 'Simular Recebimento'}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Carregando estabelecimento...</p>
            )}
          </CardContent>
        </Card>
      </main>
      <MobileNav />
    </div>
  );
}
