import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function RedefinirSenha() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Mínimo de 6 caracteres');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Senha redefinida com sucesso!');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-elevated p-10 border-t-4 border-t-tikin-navy">
          <h2 className="font-heading text-2xl font-black text-tikin-navy mb-1 text-center">NOVA SENHA</h2>
          <p className="text-sm text-tikin-navy/60 text-center mb-7">Crie uma nova senha de acesso.</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              className="w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none focus:border-tikin-navy" />
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl bg-tikin-navy hover:bg-tikin-navy/90 text-white font-heading font-extrabold tracking-wider text-sm disabled:opacity-60">
              {loading ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
