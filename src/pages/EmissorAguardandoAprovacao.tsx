import { Link } from 'react-router-dom';

export default function EmissorAguardandoAprovacao() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/"><img src="/logo-fundo-branco.webp" alt="TIKIN" className="h-7" /></Link>
          <Link to="/" className="text-tikin-navy/50 text-sm font-bold border-l border-tikin-navy/10 pl-4 hidden sm:inline">
            ← Voltar ao site
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-elevated p-10 border-t-4 border-t-tikin-navy text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-tikin-navy/10 flex items-center justify-center text-tikin-navy text-3xl">✓</div>
          <h1 className="font-heading text-3xl font-black text-tikin-navy mb-3">Cadastro Recebido</h1>
          <p className="text-tikin-navy/70 text-base leading-relaxed mb-6">
            Seu cadastro de emitente foi enviado com sucesso. Agora o time da TIKiN vai analisar os dados para liberar o acesso.
            Assim que aprovado, o login será habilitado para sua conta.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-tikin-navy px-6 py-3 text-sm font-heading font-extrabold text-white hover:bg-tikin-navy/90"
          >
            Ir para login
          </Link>
        </div>
      </div>
    </div>
  );
}
