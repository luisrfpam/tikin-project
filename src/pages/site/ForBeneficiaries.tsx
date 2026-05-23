import { Link } from "react-router-dom";
import SitePage from "@/components/site/SitePage";

export default function ForBeneficiaries() {
  return (
    <SitePage>
      {/* HERO */}
      <section className="bg-white pt-10 pb-20">
        <div className="container-tikin grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-tikin-navy/70 hover:text-tikin-navy text-sm font-bold mb-6 bg-tikin-navy/5 px-4 py-2 rounded-full transition"
            >
              ← Voltar para Início
            </Link>
            <span className="block mb-4 text-tikin-navy/50 font-heading font-extrabold text-xs tracking-[0.14em] uppercase">
              Para beneficiários
            </span>
            <h1 className="text-tikin-navy font-heading font-black text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.1] mb-6">
              Tudo o que você recebeu, em uma só carteira.
            </h1>
            <p className="text-lg text-tikin-navy/70 max-w-xl leading-relaxed">
              Na TIKIN, você acompanha saldos individuais, vê onde usar e paga com QR Code de forma rápida, prática e segura.
            </p>
            <Link
              to="/aplicativo"
              className="inline-block mt-7 bg-tikin-navy text-white px-8 py-3.5 rounded-[10px] font-heading font-extrabold text-sm tracking-wide hover:scale-[1.02] transition"
            >
              BAIXAR APLICATIVO
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 justify-items-center">
            <div className="border-8 border-black rounded-[28px] overflow-hidden shadow-elevated max-w-[240px]">
              <img src="/mockup-app-1.webp" alt="Tela inicial do app TIKIN" loading="lazy" decoding="async" className="w-full block" />
            </div>
            <div className="border-8 border-black rounded-[28px] overflow-hidden shadow-elevated max-w-[240px] mt-10">
              <img src="/mockup-app-2.webp" alt="Tela de onde usar do app TIKIN" loading="lazy" decoding="async" className="w-full block" />
            </div>
          </div>
        </div>
      </section>

      {/* CLAREZA */}
      <section className="py-20 bg-[#F7F8FA]">
        <div className="container-tikin">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-tikin-navy/10 text-tikin-navy font-heading font-bold text-[0.7rem] uppercase tracking-[0.08em] mb-4">
            Clareza
          </span>
          <h2 className="text-tikin-navy font-heading font-black text-[clamp(1.8rem,3vw,2.8rem)] mb-4">
            Você não precisa adivinhar nada.
          </h2>
          <p className="text-[1.05rem] leading-relaxed text-tikin-navy/70 max-w-3xl">
            Você abre o app e já sabe quanto tem, quais saldos estão disponíveis, onde pode usar e como pagar. Tudo em um só lugar.
          </p>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="py-20 bg-white">
        <div className="container-tikin">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-tikin-navy/10 text-tikin-navy font-heading font-bold text-[0.7rem] uppercase tracking-[0.08em] mb-4">
            Benefícios
          </span>
          <h2 className="text-tikin-navy font-heading font-black text-[clamp(1.8rem,3vw,2.8rem)] mb-8">
            Por que o app da TIKIN faz sentido para quem recebe
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { t: "Uma carteira só", d: "Todos os seus saldos reunidos em uma única experiência." },
              { t: "Pagamento simples", d: "Escaneou, confirmou, pagou." },
              { t: "Extrato claro", d: "Você sabe o que entrou, o que saiu e quanto ainda tem." },
            ].map(b => (
              <div key={b.t} className="bg-white border border-tikin-navy/10 rounded-[18px] p-7 border-t-[3px] border-t-tikin-navy">
                <h3 className="text-tikin-navy font-heading font-extrabold mb-2 text-lg">{b.t}</h3>
                <p className="text-[0.95rem] leading-relaxed text-tikin-navy/70">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ADOÇÃO */}
      <section className="py-20 bg-[#F7F8FA]">
        <div className="container-tikin">
          <h2 className="text-tikin-navy font-heading font-black text-[clamp(1.8rem,3vw,2.8rem)] mb-4">
            Quando o uso fica bom, o próprio usuário puxa a adoção.
          </h2>
          <p className="text-[1.05rem] leading-relaxed text-tikin-navy/70 max-w-3xl">
            É por isso que a TIKIN pode virar o tipo de solução que o colaborador pede para o RH adotar.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container-tikin">
          <div className="bg-tikin-navy rounded-[20px] p-12 flex justify-between items-center flex-wrap gap-6">
            <div className="max-w-2xl">
              <h2 className="text-white font-heading font-black text-[clamp(1.5rem,2.5vw,2rem)] mb-3">
                Quero mostrar isso para minha empresa
              </h2>
              <p className="text-white/80">Use seu saldo com liberdade, clareza e praticidade.</p>
            </div>
            <Link
              to="/aplicativo"
              className="bg-white text-tikin-navy px-10 py-3.5 rounded-[10px] font-heading font-extrabold text-sm whitespace-nowrap hover:scale-[1.02] transition"
            >
              BAIXAR O APP
            </Link>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
