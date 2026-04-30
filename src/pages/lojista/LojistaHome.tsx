import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, TrendingUp, Receipt } from 'lucide-react';

export default function LojistaHome() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [totalReceived, setTotalReceived] = useState(0);
  const [txCount, setTxCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('establishments').select('id').eq('user_id', user.id).single().then(async ({ data: est }) => {
      if (!est) return;
      const { data: txs } = await supabase.from('transactions').select('amount').eq('establishment_id', est.id).eq('status', 'confirmed');
      if (txs) {
        setTotalReceived(txs.reduce((sum, t) => sum + Number(t.amount), 0));
        setTxCount(txs.length);
      }
    });
  }, [user]);

  return (
    <div className="min-h-screen pb-20">
      <AppHeader />
      <main className="container max-w-lg py-6">
        <div className="mb-6 animate-fade-in">
          <h1 className="font-heading text-2xl font-bold">
            Bem-vindo, {profile?.name?.split(' ')[0]}! 🏪
          </h1>
          <p className="text-sm text-muted-foreground">Estabelecimento Credenciado</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <TrendingUp className="mb-2 h-5 w-5 text-success" />
              <p className="text-xs text-muted-foreground">Total Recebido</p>
              <p className="font-heading text-xl font-bold">R$ {totalReceived.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <Receipt className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">Transações</p>
              <p className="font-heading text-xl font-bold">{txCount}</p>
            </CardContent>
          </Card>
        </div>

        <Button
          className="w-full bg-gradient-secondary py-8 text-lg font-semibold animate-slide-up"
          onClick={() => navigate('/lojista/receber')}
        >
          <QrCode className="mr-2 h-6 w-6" />
          Receber Pagamento
        </Button>
      </main>
      <MobileNav />
    </div>
  );
}
