import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isValidEmail } from '@/lib/validators';
import { getCanonicalAppOrigin } from '@/lib/appUrl';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const errorClass = 'border-red-500 focus:border-red-500';
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailFieldValid = isValidEmail(normalizedEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!isEmailFieldValid) return toast.error('E-mail inválido');

    setLoading(true);

    const { data: canRequestReset, error: checkError } = await supabase.rpc('can_request_password_recovery', {
      _email: normalizedEmail,
    });

    if (checkError) {
      setLoading(false);
      toast.error('Não foi possível processar a solicitação agora. Tente novamente.');
      return;
    }

    if (canRequestReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${getCanonicalAppOrigin()}/redefinir-senha`,
      });

      if (error) {
        setLoading(false);
        toast.error('Não foi possível enviar. Verifique o email.');
        return;
      }
    }

    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/"><img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" /></Link>
        </div>
        <Link to="/login" className="text-tikin-navy text-sm font-extrabold hover:text-tikin-orange">← Voltar ao login</Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-elevated p-10 border-t-4 border-t-tikin-navy">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-tikin-navy/10 flex items-center justify-center text-tikin-navy text-3xl">✉</div>
              <h2 className="font-heading text-2xl font-black text-tikin-navy mb-2">EMAIL ENVIADO</h2>
              <p className="text-tikin-navy/70 mb-6">
                Se o e-mail <strong>{email}</strong> estiver vinculado a um perfil beneficiário, lojista ou emissor,
                enviaremos um link para redefinição de senha. Verifique sua caixa de entrada.
              </p>
              <Link to="/login" className="inline-block py-3 px-6 rounded-xl bg-tikin-navy text-white font-heading font-extrabold text-sm">
                VOLTAR AO LOGIN
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-black text-tikin-navy mb-1 text-center">RECUPERAR SENHA</h2>
              <p className="text-sm text-tikin-navy/60 text-center mb-7">Informe seu email cadastrado.</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block mb-2 text-[11px] font-bold tracking-wider text-tikin-navy font-heading">E-MAIL CADASTRADO</label>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={`w-full px-4 py-3.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-tikin-navy text-sm outline-none focus:border-tikin-navy ${submitAttempted && !isEmailFieldValid ? errorClass : ''}`}
                  />
                  {submitAttempted && !isEmailFieldValid && (
                    <p className="mt-1 text-[11px] font-medium text-red-600">E-mail inválido.</p>
                  )}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-xl bg-tikin-navy hover:bg-tikin-navy/90 text-white font-heading font-extrabold tracking-wider text-sm disabled:opacity-60">
                  {loading ? 'ENVIANDO...' : 'SOLICITAR NOVA SENHA DE ACESSO'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
