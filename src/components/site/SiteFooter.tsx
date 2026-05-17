import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="bg-tikin-navy text-white py-20">
      <div className="container-tikin">
        <div className="grid gap-12 md:grid-cols-4 mb-12">
          <div className="md:col-span-1">
            <img src="/logo-fundo-azul.png" alt="TIKIN" className="h-14 mb-6" />
            <p className="text-sm text-white/60 leading-relaxed">
              Redefinindo a relação entre empresas, pessoas e estabelecimentos.
            </p>
          </div>
          <div>
            <h5 className="font-heading text-sm font-extrabold text-tikin-orange mb-5">PRODUTO</h5>
            <ul className="space-y-3 text-sm text-white/80">
              <li><Link to="/como-funciona">Como funciona</Link></li>
              <li><Link to="/seguranca">Segurança</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-heading text-sm font-extrabold text-tikin-orange mb-5">PÚBLICOS</h5>
            <ul className="space-y-3 text-sm text-white/80">
              <li><Link to="/para-empresas">Para empresas</Link></li>
              <li><Link to="/para-beneficiarios">Para beneficiários</Link></li>
              <li><Link to="/para-lojistas">Para lojistas</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-heading text-sm font-extrabold text-tikin-orange mb-5">ACESSO</h5>
            <ul className="space-y-3 text-sm text-white/80">
              <li><Link to="/registro">Criar conta</Link></li>
              <li><Link to="/login">Fazer login</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-sm text-white/40">
          <p>© 2026 TIKIN Protocol. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
            <Link to="/seguranca">Compliance</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
