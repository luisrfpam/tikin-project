import { toast } from "@/hooks/use-toast";
import SitePage from "@/components/site/SitePage";

export default function Aplicativo() {
  const comingSoon = () => toast({ title: "Em breve", description: "Aplicativo disponível em breve nas lojas." });

  return (
    <SitePage>
      {/* HERO */}
      <section className="bg-white pt-24 pb-20">
        <div className="container-tikin grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div>
            <span className="block mb-4 text-tikin-navy/50 font-heading font-extrabold text-xs tracking-[0.14em] uppercase">
              Aplicativo TIKIN
            </span>
            <h1 className="text-tikin-navy font-heading font-black text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.1] mb-6">
              Seu benefício com cara de app de verdade.
            </h1>
            <p className="text-lg text-tikin-navy/70 max-w-xl leading-relaxed">
              Saldo, extrato, locais de uso e pagamento por QR Code em uma experiência simples e bem resolvida.
            </p>
            <div className="flex gap-3 flex-wrap mt-7">
              <button
                onClick={comingSoon}
                className="bg-tikin-navy text-white px-8 py-3.5 rounded-[10px] font-heading font-extrabold text-sm tracking-wide hover:scale-[1.02] transition"
              >
                APP STORE
              </button>
              <button
                onClick={comingSoon}
                className="bg-transparent text-tikin-navy border border-tikin-navy/20 px-8 py-3.5 rounded-[10px] font-heading font-extrabold text-sm tracking-wide hover:bg-tikin-navy/5 transition"
              >
                GOOGLE PLAY
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 justify-items-center">
            <div className="border-8 border-black rounded-[28px] overflow-hidden shadow-elevated max-w-[240px]">
              <img src="/mockup-app-1.webp" alt="Tela inicial do app TIKIN" loading="lazy" decoding="async" className="w-full block" />
            </div>
            <div className="border-8 border-black rounded-[28px] overflow-hidden shadow-elevated max-w-[240px] mt-10">
              <img src="/mockup-app-2.webp" alt="Tela onde usar do app TIKIN" loading="lazy" decoding="async" className="w-full block" />
            </div>
          </div>
        </div>
      </section>

      {/* O QUE RESOLVE */}
      <section className="py-20 bg-[#F7F8FA]">
        <div className="container-tikin">
          <h2 className="text-tikin-navy font-heading font-black text-[clamp(1.8rem,3vw,2.8rem)] mb-6">
            O que você resolve no app
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              "Vê seus saldos",
              "Consulta extrato",
              "Encontra onde usar",
              "Paga com QR Code",
              "Entende cada valor recebido",
            ].map(t => (
              <div key={t} className="bg-white rounded-2xl p-6 border border-tikin-navy/10">
                <p className="text-[0.95rem] text-tikin-navy/70 leading-relaxed">✓ {t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container-tikin">
          <div className="bg-tikin-navy rounded-[20px] p-12 flex justify-between items-center flex-wrap gap-6">
            <h2 className="text-white font-heading font-black text-[clamp(1.5rem,2.5vw,2rem)]">
              Disponível nas lojas Apple Store e Google Play.
            </h2>
            <button
              onClick={comingSoon}
              className="bg-white text-tikin-navy px-10 py-3.5 rounded-[10px] font-heading font-extrabold text-sm whitespace-nowrap hover:scale-[1.02] transition"
            >
              DOWNLOAD
            </button>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
