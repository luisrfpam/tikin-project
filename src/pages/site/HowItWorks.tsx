import { Link } from "react-router-dom";
import SitePage from "@/components/site/SitePage";

export default function HowItWorks() {
  return (
    <SitePage>
      {/* HERO — AZUL institucional */}
      <section className="bg-tikin-navy pt-10 pb-20">
        <div className="container-tikin grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-bold mb-6 bg-white/5 px-4 py-2 rounded-full transition"
            >
              ← Voltar para Início
            </Link>
            <span className="block mb-4 text-tikin-orange font-heading font-extrabold text-xs tracking-[0.14em] uppercase">
              Fluxo simples
            </span>
            <h1 className="font-heading font-black text-white leading-[1.1] text-[clamp(2.2rem,4vw,3.5rem)] mb-6">
              Da empresa ao uso. Do uso à venda.
            </h1>
            <p className="text-lg text-white/85 max-w-xl leading-relaxed">
              A TIKIN organiza o ciclo inteiro: distribuição com regra, uso com facilidade e venda com confirmação clara.
            </p>
            <div className="flex gap-3 flex-wrap mt-7">
              <Link
                to="/registro"
                className="bg-tikin-orange text-white px-8 py-3.5 rounded-[10px] font-heading font-extrabold text-sm tracking-wide hover:scale-[1.02] transition shadow-orange"
              >
                CADASTRAR
              </Link>
              <a
                href="#fluxo"
                className="bg-transparent text-white border border-white/35 px-8 py-3.5 rounded-[10px] font-heading font-extrabold text-sm tracking-wide hover:bg-white/10 transition"
              >
                VER O FLUXO
              </a>
            </div>
          </div>
          <div className="rounded-[20px] overflow-hidden shadow-elevated">
            <img
              src="/hero-how-it-works.png"
              alt="Fluxo dos 3 atores TIKIN"
              className="w-full block"
            />
          </div>
        </div>
      </section>

      {/* FLUXO — 3 atores */}
      <section id="fluxo" className="py-20 bg-[#F7F8FA]">
        <div className="container-tikin">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-tikin-navy/10 text-tikin-navy font-heading font-bold text-[0.7rem] uppercase tracking-[0.08em] mb-4">
            Como funciona
          </span>
          <h2 className="text-tikin-navy font-heading font-black text-[clamp(1.8rem,3vw,2.8rem)] mb-10">
            Três lados. Um fluxo melhor para todos.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* EMITENTE — AZUL */}
            <div className="bg-white border border-tikin-navy/10 rounded-[18px] p-7 border-t-4 border-t-tikin-navy">
              <div className="w-12 h-12 rounded-xl bg-tikin-navy text-white flex items-center justify-center mb-4 font-extrabold text-lg">
                E
              </div>
              <h3 className="text-tikin-navy font-heading font-extrabold mb-2">Emitente</h3>
              <p className="text-[0.95rem] leading-relaxed text-tikin-navy/70">
                A empresa define o valor, escolhe quem recebe e acompanha a distribuição.
              </p>
            </div>
            {/* BENEFICIÁRIO — BRANCO */}
            <div className="bg-white border border-tikin-navy/10 rounded-[18px] p-7 border-t-4 border-t-tikin-neutral">
              <div className="w-12 h-12 rounded-xl bg-[#F7F8FA] text-tikin-navy flex items-center justify-center mb-4 font-extrabold text-lg border-2 border-tikin-neutral">
                B
              </div>
              <h3 className="text-tikin-navy font-heading font-extrabold mb-2">Beneficiário</h3>
              <p className="text-[0.95rem] leading-relaxed text-tikin-navy/70">
                A pessoa abre o app, vê o saldo, encontra onde usar e paga com QR Code.
              </p>
            </div>
            {/* LOJISTA — LARANJA */}
            <div className="bg-white border border-tikin-navy/10 rounded-[18px] p-7 border-t-4 border-t-tikin-orange">
              <div className="w-12 h-12 rounded-xl bg-tikin-orange text-white flex items-center justify-center mb-4 font-extrabold text-lg">
                L
              </div>
              <h3 className="text-tikin-orange font-heading font-extrabold mb-2">Lojista</h3>
              <p className="text-[0.95rem] leading-relaxed text-tikin-navy/70">
                O estabelecimento informa o valor, gera o QR Code e recebe a confirmação.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VALOR */}
      <section className="py-20 bg-[#F7F8FA]">
        <div className="container-tikin">
          <h2 className="text-tikin-navy font-heading font-black text-[clamp(1.8rem,3vw,2.8rem)] mb-4">
            Não é só sobre pagar. É sobre fazer o valor circular melhor.
          </h2>
          <p className="text-[1.05rem] leading-relaxed text-tikin-navy/70 max-w-3xl">
            A TIKIN não foi criada para repetir o mercado. Foi criada para melhorar o fluxo: menos perda de eficiência para a empresa, menos fricção para o usuário e mais liquidez para o lojista.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container-tikin">
          <div className="bg-tikin-navy rounded-[20px] p-12 flex justify-between items-center flex-wrap gap-6">
            <div className="max-w-2xl">
              <h2 className="text-white font-heading font-black text-[clamp(1.5rem,2.5vw,2rem)] mb-3">
                Quero entender esse modelo
              </h2>
              <p className="text-white/80 text-base leading-relaxed">
                Descubra como cada ator se beneficia do fluxo TIKIN.
              </p>
            </div>
            <Link
              to="/registro"
              className="bg-tikin-orange text-white px-10 py-3.5 rounded-[10px] font-heading font-extrabold text-sm tracking-wide whitespace-nowrap hover:scale-[1.02] transition shadow-orange"
            >
              CADASTRAR AGORA
            </Link>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
