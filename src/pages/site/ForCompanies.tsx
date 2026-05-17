import { Link } from "react-router-dom";
import { Zap, Shield, Check } from "lucide-react";
import SitePage from "@/components/site/SitePage";

export default function ForCompanies() {
  return (
    <SitePage>
      <div className="bg-[#F7F8FA] min-h-screen text-tikin-navy">
        {/* HERO */}
        <header className="bg-tikin-navy pt-15 pb-20 relative overflow-hidden">
          <div className="container-tikin grid md:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-bold mb-6 bg-white/5 px-4 py-2 rounded-full transition"
              >
                ← Voltar para Início
              </Link>
              <span className="block mb-4 text-tikin-orange font-heading font-extrabold text-xs tracking-[0.14em] uppercase">
                Para RH, financeiro e operação
              </span>
              <h1 className="text-white font-heading font-black text-[clamp(2.2rem,4vw,3.2rem)] leading-[1.1] mb-5">
                Distribua com mais controle. Recupere mais eficiência.
              </h1>
              <p className="text-lg text-white/80 max-w-xl leading-relaxed">
                A TIKIN ajuda sua empresa a sair da lógica do benefício pouco visível e entrar em um modelo mais claro, rastreável e financeiramente inteligente.
              </p>
              <div className="mt-8">
                <Link
                  to="/registro"
                  className="inline-block bg-tikin-orange text-white px-10 py-4 rounded-xl font-heading font-extrabold shadow-orange hover:scale-[1.02] transition"
                >
                  CADASTRAR EMPRESA
                </Link>
              </div>
            </div>
            <div className="rounded-[20px] overflow-hidden shadow-elevated">
              <img src="/hero-for-companies.png" alt="Dashboard da Empresa" className="w-full block bg-white" />
            </div>
          </div>
          <div
            className="absolute -top-1/2 -left-[10%] w-[80%] h-[200%] z-0"
            style={{ background: "radial-gradient(circle, rgba(255,122,0,0.1) 0%, rgba(13,27,61,0) 70%)" }}
          />
        </header>

        <div className="max-w-[1100px] mx-auto px-5 my-20">
          {/* PROBLEMA */}
          <section className="text-center mb-20">
            <h2 className="font-heading font-black text-[2rem] mb-4 text-tikin-navy">
              O problema não é só distribuir. É não saber exatamente o que acontece depois.
            </h2>
            <p className="text-lg text-tikin-navy/70 max-w-3xl mx-auto">
              Na prática, muitas empresas convivem com baixa visibilidade, retrabalho operacional e saldo mal aproveitado. A TIKIN organiza esse fluxo de ponta a ponta para transformar distribuição em gestão real.
            </p>
          </section>

          {/* CARDS */}
          <section className="mb-20">
            <h2 className="text-[1.8rem] font-heading font-black mb-8 text-tikin-navy text-center">
              O que a sua empresa ganha com a TIKIN
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl p-8 shadow-card border-t-4 border-tikin-orange">
                <div className="w-12 h-12 rounded-xl bg-tikin-orange/10 text-tikin-orange flex items-center justify-center mb-5">
                  <Zap size={24} />
                </div>
                <h3 className="text-xl font-heading font-extrabold mb-3">Liberdade "Extra-PAT"</h3>
                <p className="text-sm text-tikin-navy/70">
                  Amparada pelo <strong>Art. 457 da CLT</strong>, a TIKIN oferece a base jurídica ideal para auxílios e prêmios sem gerar encargos trabalhistas ou previdenciários.
                </p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-card border-t-4 border-[#16a34a]">
                <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 text-[#16a34a] flex items-center justify-center mb-5">
                  <Shield size={24} />
                </div>
                <h3 className="text-xl font-heading font-extrabold mb-3">Controle de Propósito</h3>
                <p className="text-sm text-tikin-navy/70">
                  Operamos em <strong>Circuito Fechado</strong>. Isso garante que o crédito emitido será utilizado exclusivamente para a finalidade definida, eliminando desvios.
                </p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-card border-t-4 border-tikin-navy">
                <h3 className="text-xl font-heading font-extrabold mb-3 text-tikin-navy">Eficiência Financeira</h3>
                <p className="text-sm text-tikin-navy/70">
                  Quando houver regra de prazo definida, o saldo não utilizado pode retornar ao fundo da empresa. A TIKIN cobra 20% apenas sobre o valor recuperado.
                </p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-card border-t-4 border-tikin-navy">
                <h3 className="text-xl font-heading font-extrabold mb-3 text-tikin-navy">Menos Desperdício</h3>
                <p className="text-sm text-tikin-navy/70">
                  O que antes tendia a ficar invisível ou mal aproveitado passa a ser parte de uma lógica inteligente de gestão, gerando mais previsibilidade.
                </p>
              </div>
            </div>
          </section>

          {/* DIFERENCIAL */}
          <section className="bg-tikin-navy rounded-3xl p-12 text-white mb-20 shadow-elevated">
            <h2 className="text-white text-[2rem] font-heading font-black mb-4">Nosso diferencial</h2>
            <p className="text-[1.05rem] text-white/80 max-w-3xl leading-relaxed mb-8">
              A maioria das soluções do mercado comunica saldo, app, rede e gestão. A TIKIN vai além: transforma o valor não utilizado, quando houver regra de devolução definida, em oportunidade de recuperação financeira para o emitente.
            </p>
            <h3 className="text-tikin-orange text-xl font-heading font-extrabold mb-4">Por que escolher a TIKIN</h3>
            <ul className="grid md:grid-cols-2 gap-4 max-w-3xl">
              {[
                "Você distribui com regra, não no escuro",
                "Você reduz atrito operacional",
                "Você acompanha uso com mais clareza",
                "Recupere parte do valor não utilizado",
              ].map(t => (
                <li key={t} className="flex items-center gap-3">
                  <Check size={20} className="text-tikin-orange flex-shrink-0" />
                  <span className="text-[0.95rem]">{t}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* CTA */}
          <section className="text-center py-10">
            <h2 className="text-[2rem] font-heading font-black mb-4 text-tikin-navy">
              Se sua empresa quer distribuir melhor e perder menos, a conversa começa aqui.
            </h2>
            <p className="text-lg text-tikin-navy/70 max-w-xl mx-auto mb-8">
              Descubra como ganhar controle, previsibilidade e recuperar valor.
            </p>
            <Link
              to="/registro"
              className="inline-block bg-tikin-orange text-white px-10 py-4 rounded-xl font-heading font-extrabold shadow-orange hover:scale-[1.02] transition"
            >
              QUERO CADASTRAR MINHA EMPRESA
            </Link>
          </section>
        </div>
      </div>
    </SitePage>
  );
}
