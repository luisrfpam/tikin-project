import { Link } from "react-router-dom";
import { Zap, Shield, Check } from "lucide-react";
import SitePage from "@/components/site/SitePage";

export default function ForMerchants() {
  return (
    <SitePage>
      <div className="bg-[#F7F8FA] min-h-screen text-tikin-navy">
        {/* HERO */}
        <header className="bg-tikin-orange pt-15 pb-20 relative overflow-hidden">
          <div className="container-tikin grid md:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-bold mb-6 bg-white/15 px-4 py-2 rounded-full transition"
              >
                ← Voltar para Início
              </Link>
              <span className="block mb-4 text-white/80 font-heading font-extrabold text-xs tracking-[0.14em] uppercase">
                Para lojistas parceiros
              </span>
              <h1 className="text-white font-heading font-black text-[clamp(2.2rem,4vw,3.2rem)] leading-[1.1] mb-5">
                Venda mais tranquilo.<br />Receba na hora.
              </h1>
              <p className="text-lg text-white/90 max-w-xl leading-relaxed">
                A TIKIN foi desenhada para simplificar a operação do lojista: cobrança clara, confirmação rápida e taxa objetiva de 4,5% para recebimento no ato.
              </p>
              <div className="mt-8">
                <Link
                  to="/registro"
                  className="inline-block bg-white text-tikin-orange px-10 py-4 rounded-xl font-heading font-extrabold hover:scale-[1.02] transition"
                >
                  QUERO SER PARCEIRO
                </Link>
              </div>
            </div>
            <div className="rounded-[20px] overflow-hidden shadow-elevated">
              <img src="/hero-for-merchants.webp" alt="Lojista" fetchPriority="high" decoding="async" className="w-full block bg-white" />
            </div>
          </div>
          <div
            className="absolute -top-1/2 -right-[10%] w-[80%] h-[200%] z-0"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,122,0,0) 70%)" }}
          />
        </header>

        <div className="max-w-[1100px] mx-auto px-5 my-20">
          {/* PROBLEMA */}
          <section className="text-center mb-20">
            <h2 className="font-heading font-black text-[2rem] mb-4 text-tikin-navy">
              O lojista não quer promessa bonita. Quer previsibilidade.
            </h2>
            <p className="text-lg text-tikin-navy/70 max-w-3xl mx-auto">
              Quem está no caixa quer saber quanto vai receber, quando vai receber e quanto vai pagar. Sem entrelinhas, sem pegadinha e sem taxa escondida.
            </p>
          </section>

          {/* CARDS */}
          <section className="mb-20">
            <h2 className="text-[1.8rem] font-heading font-black mb-8 text-tikin-navy text-center">
              O que a TIKIN entrega para o lojista
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl p-8 shadow-card border-t-4 border-tikin-orange">
                <div className="w-12 h-12 rounded-xl bg-tikin-orange/10 text-tikin-orange flex items-center justify-center mb-5">
                  <Zap size={24} />
                </div>
                <h3 className="text-lg font-heading font-extrabold mb-3">Recebimento no ato</h3>
                <p className="text-sm text-tikin-navy/70">Vendeu, recebeu na hora.</p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-card border-t-4 border-[#16a34a]">
                <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 text-[#16a34a] flex items-center justify-center mb-5">
                  <Shield size={24} />
                </div>
                <h3 className="text-lg font-heading font-extrabold mb-3">Taxa clara</h3>
                <p className="text-sm text-tikin-navy/70">4,5% para recebimento imediato. Sem manipulação. Sem surpresa.</p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-card border-t-4 border-tikin-navy">
                <h3 className="text-lg font-heading font-extrabold mb-3 text-tikin-navy">Operação simples</h3>
                <p className="text-sm text-tikin-navy/70">Informe o valor, gere o QR Code e siga atendendo.</p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-card border-t-4 border-tikin-navy">
                <h3 className="text-lg font-heading font-extrabold mb-3 text-tikin-navy">Mais oportunidade</h3>
                <p className="text-sm text-tikin-navy/70">Ao entrar na rede TIKIN, seu negócio passa a receber clientes com saldo pronto para ser usado.</p>
              </div>
            </div>
          </section>

          {/* SEM PEGADINHA */}
          <section className="bg-tikin-navy rounded-3xl p-12 text-white mb-20 shadow-elevated">
            <h2 className="text-white text-[2rem] font-heading font-black mb-4">
              Sem pegadinha. Sem atraso. Sem conta confusa.
            </h2>
            <p className="text-[1.05rem] text-white/80 max-w-3xl leading-relaxed mb-4">
              Na TIKIN, a regra é direta: o lojista paga 4,5% para receber no ato. Não existe discurso bonito para esconder prazo longo, taxa difusa ou condição difícil de entender.
            </p>
            <p className="text-[1.05rem] text-white/80 max-w-3xl leading-relaxed mb-8">
              Isso significa mais liquidez para o seu caixa, mais previsibilidade no dia a dia e menos energia gasta tentando entender recebíveis.
            </p>
            <h3 className="text-tikin-orange text-xl font-heading font-extrabold mb-4">Por que a TIKIN é uma parceria melhor</h3>
            <ul className="space-y-4 max-w-3xl">
              {[
                "Você recebe na hora",
                "Você sabe exatamente quanto custa",
                "Você entra em uma rede com potencial real de geração de consumo",
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
              Se o seu negócio quer vender mais e receber com clareza, a TIKIN é para você.
            </h2>
            <Link
              to="/registro"
              className="inline-block mt-6 bg-tikin-orange text-white px-10 py-4 rounded-xl font-heading font-extrabold shadow-orange hover:scale-[1.02] transition"
            >
              CADASTRAR MINHA LOJA
            </Link>
          </section>
        </div>
      </div>
    </SitePage>
  );
}
