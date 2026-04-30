import { useAuth } from '@/lib/auth';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  const { profile, signOut, activeRole } = useAuth();

  const roleLabel = activeRole === 'emissor' ? 'Emissor' : activeRole === 'lojista' ? 'Estabelecimento' : 'Beneficiário';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-heading text-xl font-bold text-gradient-primary">TIKIN</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {roleLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{profile?.name}</span>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
