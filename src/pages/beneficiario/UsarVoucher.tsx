import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { mockBiometryVerify, mockTransferoSettle, addAuditLog } from '@/lib/supabase-helpers';
import { Check, Fingerprint, Loader2, QrCode } from 'lucide-react';

type Step = 'scan' | 'biometry' | 'confirm' | 'success';

export default function UsarVoucher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const voucher = location.state?.voucher;
  const [step, setStep] = useState<Step>('scan');
  const [establishmentId, setEstablishmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [establishmentName, setEstablishmentName] = useState('');

  if (!voucher) {
    return (
      <div className="min-h-screen pb-20">
        <AppHeader />
        <main className="container flex max-w-lg flex-col items-center py-20">
          <p className="text-muted-foreground">Nenhum voucher selecionado.</p>
          <Button className="mt-4" onClick={() => navigate('/beneficiario')}>Voltar</Button>
        </main>
        <MobileNav />
      </div>
    );
  }

  const handleScanSimulation = async () => {
    setLoading(true);
    // Simulate QR scan — lookup first establishment
    const { data } = await supabase.from('establishments').select('id, name').limit(1).single();
    if (data) {
      setEstablishmentId(data.id);
      setEstablishmentName(data.name);
      setStep('biometry');
    } else {
      toast.error('Nenhum estabelecimento encontrado para demo');
    }
    setLoading(false);
  };

  const handleBiometry = async () => {
    setLoading(true);
    const result = await mockBiometryVerify();
    if (result.verified) {
      toast.success('Identidade verificada!');
      setStep('confirm');
    } else {
      toast.error('Falha na verificação biométrica');
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > voucher.remaining_value) {
      toast.error('Valor inválido');
      return;
    }

    setLoading(true);

    // Create transaction
    const { data: tx, error } = await supabase.from('transactions').insert([{
      voucher_id: voucher.id,
      establishment_id: establishmentId,
      amount: val,
      status: 'confirmed' as const,
    }]).select().single();

    if (error) {
      toast.error('Erro ao processar transação');
      setLoading(false);
      return;
    }

    // Update voucher remaining_value
    const newRemaining = voucher.remaining_value - val;
    await supabase.from('vouchers').update({
      remaining_value: newRemaining,
      status: newRemaining === 0 ? 'used' : 'partially_used',
    }).eq('id', voucher.id);

    // Mock Transfero settlement
    if (tx) {
      const settlement = await mockTransferoSettle(tx.id, val);
      await supabase.from('transactions').update({ transfero_tx_id: settlement.tx_id }).eq('id', tx.id);
    }

    // Audit log
    await addAuditLog('voucher_used', 'voucher', voucher.id, { amount: val, establishment: establishmentId });

    setLoading(false);
    setStep('success');
  };

  return (
    <div className="min-h-screen pb-20">
      <AppHeader />
      <main className="container max-w-lg py-6">
        {step === 'scan' && (
          <Card className="animate-fade-in shadow-elevated">
            <CardContent className="flex flex-col items-center py-10">
              <QrCode className="mb-4 h-20 w-20 text-primary/30" />
              <h2 className="mb-2 font-heading text-xl font-semibold">Escanear QR Code</h2>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                Aponte a câmera para o QR Code do Estabelecimento Credenciado
              </p>
              <Button onClick={handleScanSimulation} disabled={loading} className="bg-gradient-primary">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Simular Escaneamento
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'biometry' && (
          <Card className="animate-fade-in shadow-elevated">
            <CardContent className="flex flex-col items-center py-10">
              <Fingerprint className="mb-4 h-20 w-20 text-primary/30" />
              <h2 className="mb-2 font-heading text-xl font-semibold">Validação Biométrica</h2>
              <p className="mb-2 text-sm text-muted-foreground">{establishmentName}</p>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                Confirme sua identidade com biometria facial
              </p>
              <Button onClick={handleBiometry} disabled={loading} className="bg-gradient-primary">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
                Verificar Identidade
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'confirm' && (
          <Card className="animate-fade-in shadow-elevated">
            <CardContent className="py-6">
              <h2 className="mb-4 font-heading text-xl font-semibold">Confirmar Pagamento</h2>
              <div className="mb-4 rounded-lg bg-accent p-3">
                <p className="text-xs text-muted-foreground">Estabelecimento</p>
                <p className="font-medium">{establishmentName}</p>
              </div>
              <div className="mb-4 rounded-lg bg-accent p-3">
                <p className="text-xs text-muted-foreground">Saldo disponível</p>
                <p className="font-heading text-2xl font-bold text-primary">R$ {voucher.remaining_value.toFixed(2)}</p>
              </div>
              <div className="mb-6">
                <Label htmlFor="amount">Valor a utilizar (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  max={voucher.remaining_value}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="text-xl font-semibold"
                />
              </div>
              <Button onClick={handleConfirm} disabled={loading} className="w-full bg-gradient-secondary py-6 text-lg font-semibold">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar e Pagar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card className="animate-slide-up shadow-elevated">
            <CardContent className="flex flex-col items-center py-10">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success">
                <Check className="h-8 w-8 text-success-foreground" />
              </div>
              <h2 className="mb-2 font-heading text-xl font-semibold">Pagamento Realizado!</h2>
              <p className="mb-1 text-sm text-muted-foreground">Liquidação instantânea via Transfero</p>
              <p className="mb-6 text-2xl font-bold text-primary">R$ {parseFloat(amount).toFixed(2)}</p>
              <Button onClick={() => navigate('/beneficiario')} variant="outline">
                Voltar para Home
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
