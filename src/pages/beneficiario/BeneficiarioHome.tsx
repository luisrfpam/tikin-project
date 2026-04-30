import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Wallet, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VoucherData {
  id: string;
  value: number;
  remaining_value: number;
  expiration_date: string;
  rules: Record<string, string>;
  status: string;
}

export default function BeneficiarioHome() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('vouchers')
      .select('*')
      .eq('beneficiary_id', user.id)
      .in('status', ['active', 'partially_used'])
      .then(({ data }) => {
        setVouchers((data as VoucherData[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const activeVoucher = vouchers[0];

  return (
    <div className="min-h-screen pb-20">
      <AppHeader />
      <main className="container max-w-lg py-6">
        <div className="mb-6 animate-fade-in">
          <h1 className="font-heading text-2xl font-bold">
            Olá, {profile?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">Seus vouchers de propósito específico</p>
        </div>

        {activeVoucher ? (
          <Card className="mb-6 animate-slide-up overflow-hidden border-0 shadow-elevated">
            <div className="bg-gradient-primary px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-primary-foreground/70">Voucher Ativo</p>
                  <p className="font-heading text-3xl font-bold text-primary-foreground">
                    R$ {activeVoucher.remaining_value.toFixed(2)}
                  </p>
                </div>
                <Shield className="h-10 w-10 text-primary-foreground/30" />
              </div>
              <div className="mt-3 flex gap-2">
                <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  Válido até {format(new Date(activeVoucher.expiration_date), "dd/MM/yyyy")}
                </Badge>
                {activeVoucher.rules?.category && (
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground text-xs">
                    {activeVoucher.rules.category}
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="p-4">
              <Button
                className="w-full bg-gradient-secondary text-lg font-semibold py-6"
                onClick={() => navigate('/beneficiario/usar-voucher', { state: { voucher: activeVoucher } })}
              >
                <QrCode className="mr-2 h-5 w-5" />
                Usar Voucher
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 animate-fade-in border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <Wallet className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {loading ? 'Carregando...' : 'Nenhum voucher ativo no momento'}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="animate-fade-in">
          <h2 className="mb-3 font-heading text-lg font-semibold">Meus Vouchers</h2>
          {vouchers.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">Nenhum voucher encontrado.</p>
          )}
          <div className="space-y-3">
            {vouchers.map(v => (
              <Card key={v.id} className="shadow-card">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">R$ {v.remaining_value.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      de R$ {v.value.toFixed(2)} • {v.rules?.category || 'Geral'}
                    </p>
                  </div>
                  <Badge variant={v.status === 'active' ? 'default' : 'secondary'}>
                    {v.status === 'active' ? 'Ativo' : v.status === 'partially_used' ? 'Parcial' : v.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
