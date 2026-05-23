import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LockKeyhole, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  setAdminSession,
} from '@/lib/adminCredentials';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setLoading(false);
      toast.error('Credenciais administrativas inválidas.');
      return;
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc('is_tikin_admin');
    if (roleError || !isAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error('Usuário sem permissão administrativa TIKiN.');
      return;
    }

    setAdminSession(true);
    setLoading(false);
    toast.success('Login administrativo realizado.');
    navigate('/tikin-admin/emissores', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
          <span className="text-tikin-navy/50 text-sm font-bold border-l border-tikin-navy/10 pl-4 hidden sm:inline">
            Ambiente administrativo
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-elevated p-10 border-t-4 border-t-tikin-navy">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-tikin-navy text-white flex items-center justify-center">
              <LockKeyhole size={28} />
            </div>
            <h2 className="font-heading text-2xl font-black text-tikin-navy mb-1">PAINEL TIKIN ADM</h2>
            <p className="text-sm text-tikin-navy/60">Acesso restrito para aprovação de emitentes.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">E-MAIL ADMIN</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@tikin"
                className="w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none focus:border-tikin-navy"
              />
            </div>
            <div>
              <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">SENHA</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3.5 pr-11 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none focus:border-tikin-navy"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tikin-navy/50 hover:text-tikin-navy"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-tikin-navy hover:bg-tikin-navy/90 text-white font-heading font-extrabold tracking-wider text-sm disabled:opacity-60"
            >
              {loading ? 'ENTRANDO...' : 'ENTRAR COMO ADMIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
