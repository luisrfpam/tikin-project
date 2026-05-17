import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isValidEmail } from '@/lib/validators';

export default function SolicitarOnboarding() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('Informe seu nome');
    if (!isValidEmail(email)) return toast.error('E-mail inválido');
    setLoading(true);
    const { error } = await supabase.from('onboarding_requests').insert({ name: name.trim(), email: email.trim() });
    setLoading(false);
    if (error) {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
      return;
    }
    setSent(true);
    toast.success('Solicitação enviada com sucesso!');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
          <Link to="/" className="text-tikin-navy/50 text-sm font-bold border-l border-tikin-navy/10 pl-4 hidden sm:inline">
            ← Voltar ao site
          </Link>
        </div>
        <Link to="/login" className="text-tikin-navy text-sm font-extrabold hover:text-tikin-orange">Já tenho conta</Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-elevated p-10 border-t-4 border-t-tikin-navy">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-tikin-navy/10 flex items-center justify-center text-tikin-navy text-3xl">✓</div>
              <h2 className="font-heading text-2xl font-black text-tikin-navy mb-2">SOLICITAÇÃO ENVIADA</h2>
              <p className="text-tikin-navy/70 mb-6">
                Recebemos sua solicitação de onboarding. Nossa equipe entrará em contato em breve pelo email informado.
              </p>
              <Link to="/" className="inline-block py-3 px-6 rounded-xl bg-tikin-navy text-white font-heading font-extrabold text-sm">
                VOLTAR AO SITE
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-black text-tikin-navy mb-1 text-center">SOLICITAR ONBOARDING</h2>
              <p className="text-sm text-tikin-navy/60 text-center mb-7">Preencha os dados e entraremos em contato.</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">NOME DE CONTATO</label>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none focus:border-tikin-navy"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">E-MAIL</label>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none focus:border-tikin-navy"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-xl bg-tikin-navy hover:bg-tikin-navy/90 text-white font-heading font-extrabold tracking-wider text-sm disabled:opacity-60">
                  {loading ? 'ENVIANDO...' : 'CONFIRMAR SOLICITAÇÃO'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
