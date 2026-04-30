import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface TxData {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function LojistaExtrato() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TxData[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('establishments').select('id').eq('user_id', user.id).single().then(async ({ data: est }) => {
      if (!est) return;
      const { data } = await supabase.from('transactions').select('*').eq('establishment_id', est.id).order('created_at', { ascending: false });
      setTransactions((data as TxData[]) ?? []);
    });
  }, [user]);

  return (
    <div className="min-h-screen pb-20">
      <AppHeader />
      <main className="container max-w-lg py-6">
        <h1 className="mb-6 font-heading text-2xl font-bold">Extrato</h1>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => (
              <Card key={tx.id} className="shadow-card">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-success">+R$ {tx.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <Badge variant="default">Liquidado</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
