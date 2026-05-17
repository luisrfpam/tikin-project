import { Link } from "react-router-dom";
import SitePage from "@/components/site/SitePage";
import { Check, Shield, Zap, BarChart3, QrCode, Users } from "lucide-react";

export default function Landing() {
  return (
    <SitePage>
      {/* HERO */}
      <header
        className="relative min-h-[600px] bg-cover bg-center"
        style={{ backgroundImage: "url('/heronew.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-tikin-navy/85 via-tikin-navy/60 to-transparent" />
        <div className="container-tikin relative z-10 flex min-h-[600px] flex-col justify-center py-20">
          <div className="max-w-2xl">
            <h1 className="font-heading text-4xl md:text-6xl font-black text-white leading-[1.05] mb-6">
              VOUCHERS DIGITAIS COM PAGAMENTO POR QR CODE E RECEBIMENTO NA HORA.
            </h1>
            <p className="text-lg text-white/90 mb-10 leading-relaxed">
              A empresa distribui. O usuário paga pelo app. O lojista recebe no ato. Tudo com regras claras, saldo rastreável e uma experiência simples de ponta a ponta.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/registro"
                className="rounded-xl bg-tikin-orange px-8 py-4 font-heading font-extrabold text-white shadow-orange hover:scale-[1.02] transition"
              >
                CRIAR CONTA GRATUITA
              </Link>
              <Link
                to="/como-funciona"
                className="rounded-xl border border-white/30 backdrop-blur px-8 py-4 font-heading font-extrabold text-white hover:bg-white/10"
              >
                COMO FUNCIONA
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* PROBLEMS */}
      <section className="bg-tikin-black text-white py-24">
        <div className="container-tikin">
          <h2 className="font-heading text-4xl md:text-5xl font-black mb-4">
            O MERCADO TRADICIONAL <br />
            <span className="text-tikin-orange">ESTÁ ESTAGNADO.</span>
          </h2>
          <p className="text-lg text-tikin-neutral max-w-2xl mb-12">
            Bandeiras e intermediários que travam seu lucro e ignoram suas necessidades.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { tag: "RH E GESTORES", title: "Distribuir benefícios não deveria dar trabalho.", img: "/problema_rh_taxas.png" },
              { tag: "COLABORADORES", title: "O saldo deveria ser claro e fácil de usar.", img: "/problema_colaborador.png" },
              { tag: "LOJISTAS", title: "Receber não pode levar dias e taxas escondidas.", img: "/problema_lojista.png" },
            ].map(p => (
              <div
                key={p.tag}
                className="relative h-80 overflow-hidden rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,0.85)), url('${p.img}')` }}
              >
                <div className="absolute bottom-0 p-6">
                  <p className="text-xs font-extrabold text-tikin-orange mb-2">{p.tag}</p>
                  <h4 className="font-heading text-xl font-black">{p.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THREE ACTORS */}
      {[
        {
          id: "ben",
          img: "/imagem-ilustrativa-dobra-beneficiario.png",
          title: "TUDO QUE VOCÊ RECEBEU EM UMA CARTEIRA SIMPLES.",
          desc: "Você tem saldo, extrato claro, sabe exatamente onde usar e paga na hora via QR Code sem nenhuma complicação.",
          cta: "Para Beneficiários",
          to: "/para-beneficiarios",
          dark: false,
          align: "right",
        },
        {
          id: "emp",
          img: "/imagem-ilustrativa-dobra-emitente.png",
          title: "DISTRIBUA COM CONTROLE ABSOLUTO.",
          desc: "Acompanhe o uso e recupere a eficiência operacional. Sua empresa distribui com clareza e acompanha com segurança.",
          cta: "Para Empresas",
          to: "/para-empresas",
          dark: true,
          align: "left",
        },
        {
          id: "loj",
          img: "/imagem-ilustrativa-dobra-lojista.png",
          title: "VENDEU. RECEBEU.",
          desc: "Venda para milhares de usuários com saldo disponível. Com a TIKIN, o lojista recebe no ato com taxa clara, sem letras miúdas.",
          cta: "Para Lojistas",
          to: "/para-lojistas",
          dark: true,
          align: "right",
        },
      ].map(a => (
        <section
          key={a.id}
          className="relative min-h-[500px] bg-cover bg-center flex items-center"
          style={{ backgroundImage: `url('${a.img}')` }}
        >
          <div className={`absolute inset-0 ${a.dark ? "bg-tikin-navy/75" : "bg-white/55"}`} />
          <div className={`container-tikin relative z-10 flex ${a.align === "right" ? "justify-end" : ""}`}>
            <div className={`max-w-xl ${a.align === "right" ? "text-right" : ""}`}>
              <h2 className={`font-heading text-4xl md:text-5xl font-black mb-6 leading-tight ${a.dark ? "text-white" : "text-tikin-navy"}`}>
                {a.title}
              </h2>
              <p className={`text-lg mb-8 leading-relaxed ${a.dark ? "text-white/85" : "text-tikin-navy/80"}`}>
                {a.desc}
              </p>
              <Link
                to={a.to}
                className={`inline-block rounded-xl px-8 py-4 font-heading font-extrabold ${
                  a.dark ? "bg-tikin-orange text-white shadow-orange" : "bg-tikin-navy text-white"
                }`}
              >
                SAIBA MAIS — {a.cta.toUpperCase()}
              </Link>
            </div>
          </div>
        </section>
      ))}

      {/* HOW IT WORKS */}
      <section className="py-24 bg-tikin-neutral/40">
        <div className="container-tikin">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl md:text-5xl font-black text-tikin-navy mb-4">
              UM FLUXO, TRÊS ATORES, <span className="text-tikin-orange">ZERO COMPLICAÇÃO.</span>
            </h2>
            <p className="text-lg text-tikin-navy/70 max-w-2xl mx-auto">
              Transformamos a promessa em realidade através de um processo linear e seguro.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: "1", t: "DISTRIBUIÇÃO", d: "RH emite vouchers com regras claras" },
              { n: "2", t: "UTILIZAÇÃO", d: "Beneficiário paga via QR Code biométrico" },
              { n: "3", t: "LIQUIDAÇÃO", d: "Lojista recebe no ato via Blockchain" },
              { n: "4", t: "CONTROLE", d: "Saldo não usado retorna ao fundo" },
            ].map((s, i) => (
              <div key={s.n} className="text-center">
                <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center font-heading font-black text-xl ${
                  i % 2 === 0 ? "bg-tikin-navy text-white" : "bg-tikin-orange text-white"
                }`}>
                  {s.n}
                </div>
                <h4 className="font-heading font-extrabold text-tikin-navy mb-2">{s.t}</h4>
                <p className="text-sm text-tikin-navy/60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RETURN TO FUND */}
      <section className="py-24 bg-tikin-navy text-white">
        <div className="container-tikin grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-heading text-4xl md:text-5xl font-black mb-6 leading-tight">
              SALDO NÃO UTILIZADO <br />
              <span className="text-tikin-orange">VOLTA PARA A EMPRESA.</span>
            </h2>
            <p className="text-lg text-white/85 mb-6 leading-relaxed">
              Não deixe dinheiro parado na mesa. Nosso ecossistema garante eficiência financeira na gestão do seu programa de benefícios.
            </p>
            <div className="bg-white/5 border-l-4 border-tikin-orange p-6 rounded-r-xl">
              <p className="italic text-white/90">
                "Quando o saldo tem prazo definido e não é utilizado, o valor remanescente pode retornar ao fundo da empresa. A TIKIN cobra apenas sobre o valor recuperado."
              </p>
            </div>
          </div>
          <div className="bg-white text-tikin-navy rounded-3xl p-8 shadow-elevated">
            <p className="text-xs font-extrabold uppercase opacity-50 mb-2 text-center">Retorno de saldo expirado</p>
            <p className="text-5xl font-heading font-black text-success text-center mb-4">+ R$ 12.450,00</p>
            <div className="h-2 bg-tikin-navy/10 rounded-full mb-3">
              <div className="h-full w-[80%] bg-tikin-orange rounded-full" />
            </div>
            <p className="text-sm text-tikin-navy/60 text-center">Retornado ao fundo central do RH este mês.</p>
          </div>
        </div>
      </section>

      {/* APP SECTION */}
      <section className="py-24 bg-white">
        <div className="container-tikin grid md:grid-cols-2 gap-16 items-center">
          <img src="/hero.png" alt="App TIKIN" className="w-full" />
          <div>
            <h2 className="font-heading text-4xl md:text-5xl font-black text-tikin-navy mb-6">
              A EXPERIÊNCIA NA PALMA DA MÃO.
            </h2>
            <p className="text-lg text-tikin-navy/75 mb-8 italic">
              "Você sabe o que recebeu, onde pode usar e resolve tudo rápido se precisar."
            </p>
            <ul className="space-y-3">
              {[
                "Vê seus saldos consolidados",
                "Entende cada valor recebido",
                "Consulta extrato detalhado",
                "Encontra onde usar com facilidade",
                "Paga rapidamente com QR Code biométrico",
              ].map(t => (
                <li key={t} className="flex items-center gap-3 text-tikin-navy">
                  <Check className="text-tikin-orange flex-shrink-0" size={22} />
                  <span className="font-medium">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="py-24 bg-tikin-navy text-white">
        <div className="container-tikin text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-black mb-4">
            SEGURANÇA É <span className="text-tikin-orange">CONFIANÇA OPERACIONAL.</span>
          </h2>
          <p className="text-lg text-white/85 max-w-2xl mx-auto">
            A TIKIN valida lojistas, restringe o uso por finalidade e mantém o fluxo rastreável.
          </p>
        </div>
        <div className="container-tikin grid md:grid-cols-3 gap-6">
          {[
            { i: Shield, t: "VALIDAMOS QUEM VENDE", d: "Onboarding via CNAE garante que apenas lojistas habilitados aceitem os vouchers correspondentes." },
            { i: Zap, t: "BLOCKCHAIN", d: "Cada voucher é registrado em blockchain, garantindo integridade e imutabilidade dos dados." },
            { i: BarChart3, t: "AUDITORIA IMUTÁVEL", d: "Cada ação fica registrada em log imutável. Rastreabilidade ponta a ponta." },
          ].map(c => {
            const Icon = c.i;
            return (
              <div key={c.t} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-tikin-orange/50 transition">
                <Icon className="text-tikin-orange mb-4" size={32} />
                <h4 className="font-heading font-extrabold text-tikin-orange mb-3">{c.t}</h4>
                <p className="text-white/75 text-sm leading-relaxed">{c.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-tikin-orange text-white">
        <div className="container-tikin text-center">
          <h2 className="font-heading text-4xl md:text-5xl font-black mb-6">PRONTO PARA COMEÇAR?</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto opacity-95">
            Crie sua conta em minutos como Empresa, Beneficiário ou Lojista.
          </p>
          <Link
            to="/registro"
            className="inline-block rounded-xl bg-white text-tikin-orange px-10 py-5 font-heading font-black text-lg shadow-elevated hover:scale-[1.02] transition"
          >
            CRIAR CONTA GRATUITA
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
