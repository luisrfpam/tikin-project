import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/como-funciona", label: "COMO FUNCIONA" },
    { to: "/para-empresas", label: "PARA EMPRESAS" },
    { to: "/para-beneficiarios", label: "PARA BENEFICIÁRIOS" },
    { to: "/para-lojistas", label: "PARA LOJISTAS" },
    { to: "/aplicativo", label: "APLICATIVO" },
    { to: "/seguranca", label: "SEGURANÇA" },
    { to: "/faq", label: "FAQ" },
  ];
  return (
    <nav className="sticky top-0 z-50 bg-white shadow-card">
      <div className="container-tikin flex h-[70px] items-center justify-between gap-3">
        <Link to="/" className="flex-shrink-0" onClick={() => setOpen(false)}>
          <img src="/logo-fundo-branco.png" alt="TIKIN" className="h-6 sm:h-7" />
        </Link>
        <div className="hidden flex-1 items-center justify-center gap-5 lg:flex">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="font-heading text-[12px] font-bold text-tikin-navy hover:text-tikin-orange transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/registro")}
            className="rounded-lg bg-tikin-orange px-3 py-2 sm:px-4 sm:py-2.5 font-heading text-[11px] sm:text-xs font-extrabold text-white shadow-orange hover:opacity-95 whitespace-nowrap"
          >
            <span className="hidden sm:inline">ENTRAR / CADASTRAR</span>
            <span className="sm:hidden">ENTRAR</span>
          </button>
          <button
            onClick={() => setOpen(!open)}
            aria-label="Abrir menu"
            className="lg:hidden p-2 rounded-md text-tikin-navy hover:bg-tikin-navy/5"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-tikin-navy/10 bg-white">
          <div className="container-tikin flex flex-col py-3">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="font-heading text-sm font-bold text-tikin-navy py-3 border-b border-tikin-navy/5 last:border-0"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
