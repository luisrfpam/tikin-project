import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, CreditCard, Shield } from 'lucide-react';

export default function BeneficiarioPerfil() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen pb-20">
      <AppHeader />
      <main className="container max-w-lg py-6">
        <h1 className="mb-6 font-heading text-2xl font-bold">Perfil</h1>
        <Card className="mb-6 shadow-card">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{profile?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="font-medium">{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">CPF</p>
                <p className="font-medium">{profile?.cpf || 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Biometria</p>
                <p className="font-medium text-success">Verificada (Mock)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" className="w-full" onClick={signOut}>Sair</Button>
      </main>
      <MobileNav />
    </div>
  );
}
