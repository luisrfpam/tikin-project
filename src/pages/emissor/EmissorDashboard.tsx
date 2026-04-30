import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { mockQuantumCertMint, addAuditLog } from '@/lib/supabase-helpers';
import { Plus, Wallet, FileText, BarChart3, Shield, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface VoucherRow {
  id: string;
  beneficiary_cpf: string;
  value: number;
  remaining_value: number;
  expiration_date: string;
  status: string;
  rules: Record<string, string>;
  quantumcert_asset_id: string | null;
}

interface IssuerData {
  id: string;
  company_name: string;
  fund_balance: number;
}

export default function EmissorDashboard() {
  const { user, signOut, profile } = useAuth();
  const [issuer, setIssuer] = useState<IssuerData | null>(null);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [cpf, setCpf] = useState('');
  const [value, setValue] = useState('');
  const [expDate, setExpDate] = useState('');
  const [category, setCategory] = useState('alimentacao');
  const [geofence, setGeofence] = useState('');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: iss } = await supabase.from('issuers').select('*').eq('user_id', user.id).single();
    if (iss) {
      setIssuer(iss as IssuerData);
      const { data: vList } = await supabase.from('vouchers').select('*').eq('issuer_id', iss.id).order('created_at', { ascending: false });
      setVouchers((vList as VoucherRow[]) ?? []);
    }
  };

  const handleEmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer) return;
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    if (val > issuer.fund_balance) { toast.error('Saldo insuficiente no Fundo do Emissor'); return; }

    setLoading(true);

    // Find beneficiary by CPF
    const { data: benefProfile } = await supabase.from('profiles').select('id').eq('cpf', cpf).single();

    const { data: voucher, error } = await supabase.from('vouchers').insert([{
      issuer_id: issuer.id,
      beneficiary_id: benefProfile?.id ?? null,
      beneficiary_cpf: cpf,
      value: val,
      remaining_value: val,
      expiration_date: expDate,
      rules: { category, geofence: geofence || 'nacional' },
      status: 'active' as const,
    }]).select().single();

    if (error) { toast.error('Erro ao emitir voucher'); setLoading(false); return; }

    // Mock QuantumCert
    if (voucher) {
      const qc = await mockQuantumCertMint(voucher.id);
      await supabase.from('vouchers').update({ quantumcert_asset_id: qc.quantumcert_asset_id }).eq('id', voucher.id);

      // Deduct from fund
      await supabase.from('issuers').update({ fund_balance: issuer.fund_balance - val }).eq('id', issuer.id);

      await addAuditLog('voucher_emitted', 'voucher', voucher.id, { value: val, cpf });
    }

    toast.success('Voucher emitido com sucesso! Certificado QuantumCert gerado.');
    setShowForm(false);
    setCpf(''); setValue(''); setExpDate(''); setGeofence('');
    setLoading(false);
    loadData();
  };

  const stats = {
    total: vouchers.length,
    active: vouchers.filter(v => v.status === 'active' || v.status === 'partially_used').length,
    totalValue: vouchers.reduce((s, v) => s + Number(v.value), 0),
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Dashboard Emissor</h1>
            <p className="text-sm text-muted-foreground">{issuer?.company_name}</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Emitir Voucher
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <Wallet className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">Fundo do Emissor</p>
              <p className="font-heading text-xl font-bold">R$ {(issuer?.fund_balance ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <FileText className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">Vouchers Emitidos</p>
              <p className="font-heading text-xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <BarChart3 className="mb-2 h-5 w-5 text-success" />
              <p className="text-xs text-muted-foreground">Vouchers Ativos</p>
              <p className="font-heading text-xl font-bold">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <Shield className="mb-2 h-5 w-5 text-warning" />
              <p className="text-xs text-muted-foreground">Valor Total Emitido</p>
              <p className="font-heading text-xl font-bold">R$ {stats.totalValue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Emit Form */}
        {showForm && (
          <Card className="mb-6 animate-slide-up shadow-elevated">
            <CardHeader>
              <CardTitle>Emitir Voucher de Propósito Específico</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmit} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>CPF do Beneficiário</Label>
                  <Input value={cpf} onChange={e => setCpf(e.target.value)} required placeholder="000.000.000-00" />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} required placeholder="100.00" />
                </div>
                <div>
                  <Label>Data de Validade</Label>
                  <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required />
                </div>
                <div>
                  <Label>Categoria (Propósito)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="alimentacao">Alimentação</option>
                    <option value="transporte">Transporte</option>
                    <option value="hospedagem">Hospedagem</option>
                    <option value="saude">Saúde</option>
                    <option value="educacao">Educação</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Geofence (opcional)</Label>
                  <Input value={geofence} onChange={e => setGeofence(e.target.value)} placeholder="Ex: São Paulo, SP" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={loading} className="bg-gradient-primary">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                    Emitir com QuantumCert
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Voucher List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Vouchers Emitidos</CardTitle>
          </CardHeader>
          <CardContent>
            {vouchers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum voucher emitido ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">CPF</th>
                      <th className="pb-2 font-medium">Valor</th>
                      <th className="pb-2 font-medium">Restante</th>
                      <th className="pb-2 font-medium">Validade</th>
                      <th className="pb-2 font-medium">Categoria</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">QuantumCert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map(v => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-3">{v.beneficiary_cpf}</td>
                        <td className="py-3">R$ {Number(v.value).toFixed(2)}</td>
                        <td className="py-3">R$ {Number(v.remaining_value).toFixed(2)}</td>
                        <td className="py-3">{format(new Date(v.expiration_date), 'dd/MM/yyyy')}</td>
                        <td className="py-3">
                          <Badge variant="secondary">{v.rules?.category || '-'}</Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={v.status === 'active' ? 'default' : 'secondary'}>
                            {v.status === 'active' ? 'Ativo' : v.status === 'used' ? 'Usado' : v.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {v.quantumcert_asset_id ? `${v.quantumcert_asset_id.slice(0, 10)}...` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
