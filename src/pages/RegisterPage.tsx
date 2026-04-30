import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Role = 'beneficiario' | 'lojista' | 'emissor';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpfOrCnpj, setCpfOrCnpj] = useState('');
  const [role, setRole] = useState<Role>('beneficiario');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Update profile with CPF/CNPJ
      const profileUpdate: Record<string, string> = {};
      if (role === 'beneficiario') profileUpdate.cpf = cpfOrCnpj;
      else profileUpdate.cnpj = cpfOrCnpj;

      await supabase.from('profiles').update({ ...profileUpdate, name }).eq('id', data.user.id);

      // Assign role
      await supabase.from('user_roles').insert([{ user_id: data.user.id, role }]);

      // If emissor, create issuer record
      if (role === 'emissor') {
        await supabase.from('issuers').insert([{
          user_id: data.user.id,
          company_name: name,
          cnpj: cpfOrCnpj,
          fund_balance: 100000,
        }]);
      }

      // If lojista, create establishment record
      if (role === 'lojista') {
        await supabase.from('establishments').insert([{
          user_id: data.user.id,
          name,
          cnpj: cpfOrCnpj,
          cnae: '5611201',
          cnae_validated: true,
        }]);
      }
    }

    setLoading(false);
    toast.success('Conta criada! Verifique seu e-mail para confirmar.');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-4">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-4xl font-bold text-primary-foreground">TIKIN</h1>
        <p className="mt-2 text-sm text-primary-foreground/70">Criar sua conta</p>
      </div>
      <div className="w-full max-w-sm animate-fade-in rounded-lg border border-border bg-card p-6 shadow-elevated">
        <h2 className="mb-6 text-center font-heading text-xl font-semibold">Registro</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome" />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <Label>Tipo de conta</Label>
            <Select value={role} onValueChange={v => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beneficiario">Beneficiário</SelectItem>
                <SelectItem value="lojista">Estabelecimento Credenciado</SelectItem>
                <SelectItem value="emissor">Emissor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cpfcnpj">{role === 'beneficiario' ? 'CPF' : 'CNPJ'}</Label>
            <Input id="cpfcnpj" value={cpfOrCnpj} onChange={e => setCpfOrCnpj(e.target.value)} required placeholder={role === 'beneficiario' ? '000.000.000-00' : '00.000.000/0000-00'} />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
