import { Link } from "react-router-dom";
import { Building2, User, Box, Store } from "lucide-react";
import SitePage from "@/components/site/SitePage";

const FaqItem = ({ q, a, accent = "navy" }: { q: string; a: React.ReactNode; accent?: "navy" | "orange" | "muted" }) => {
  const colors = {
    navy: { sum: "text-tikin-navy", border: "border-tikin-navy/5", shadow: "shadow-card" },
    orange: { sum: "text-tikin-orange", border: "border-tikin-orange/10", shadow: "shadow-card" },
    muted: { sum: "text-tikin-navy/80", border: "border-tikin-navy/5", shadow: "shadow-card" },
  }[accent];
  return (
    <details className={`bg-white rounded-2xl ${colors.shadow} overflow-hidden border ${colors.border}`}>
      <summary className={`p-5 font-bold cursor-pointer font-heading ${colors.sum}`}>{q}</summary>
      <div className={`px-5 pb-5 pt-4 text-tikin-navy/70 text-[0.95rem] leading-relaxed border-t ${colors.border}`}>{a}</div>
    </details>
  );
};

export default function Faq() {
  return (
    <SitePage>
      <div className="bg-[#F7F8FA] min-h-screen text-tikin-navy pb-24">
        {/* HEADER */}
        <header className="bg-tikin-navy text-white py-12 px-5 text-center">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-bold mb-6 bg-white/5 px-4 py-2 rounded-full transition"
            >
              ← Voltar para Início
            </Link>
            <h1 className="text-[2.8rem] font-heading font-black mb-5 tracking-tight">
              Central de <span className="text-tikin-orange">Ajuda.</span>
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Transparência total. Entenda o ecossistema TIKIN e nossa infraestrutura desenhada para reduzir riscos operacionais.
            </p>
          </div>
        </header>

        <div className="max-w-[1000px] mx-auto mt-10 px-5">
          {/* GLOSSÁRIO */}
          <section className="mb-20">
            <h2 className="text-[2rem] font-heading font-black mb-6 text-tikin-navy text-center">
              Glossário do Ecossistema
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { Icon: Building2, color: "text-tikin-orange", border: "border-b-tikin-orange", t: "Emitente", d: "A empresa (B2B) que define regras, distribui os vouchers e estipula prazos e condições para uso de seus beneficiários." },
                { Icon: User, color: "text-tikin-navy", border: "border-b-tikin-navy", t: "Beneficiário", d: "O usuário que recebe o valor distribuído pelo emitente, para uso restrito e vinculado às condições previamente informadas." },
                { Icon: Box, color: "text-[#16a34a]", border: "border-b-[#16a34a]", t: "Voucher Específico", d: "Saldo de uso restrito, com regras de aceitação em circuito fechado, que não pode ser sacado, transferido livremente ou convertido em dinheiro." },
                { Icon: Store, color: "text-[#9333ea]", border: "border-b-[#9333ea]", t: "Lojista Credenciado", d: "O prestador de serviço previamente validado via CNAE e em conformidade para aceitar os vouchers, recebendo sua liquidação." },
              ].map(({ Icon, color, border, t, d }) => (
                <div key={t} className={`bg-white rounded-[20px] p-6 shadow-card border-b-4 ${border}`}>
                  <div className={`mb-3 ${color}`}><Icon size={32} /></div>
                  <h3 className="text-base font-heading font-extrabold mb-2">{t}</h3>
                  <p className="text-[0.85rem] text-tikin-navy/70">{d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* TABELA COMPARATIVA */}
          <section className="mb-20">
            <h2 className="text-[2rem] font-heading font-black mb-3 text-tikin-navy text-center">
              Por que a TIKIN é diferente
            </h2>
            <p className="text-center text-[0.95rem] text-tikin-navy/60 mb-10">
              Uma comparação técnica focada na mitigação de riscos e orquestração sistêmica.
            </p>
            <div className="bg-white rounded-3xl overflow-hidden shadow-elevated overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr className="bg-tikin-navy text-white">
                    <th className="p-6 font-heading font-extrabold">Característica</th>
                    <th className="p-6 font-heading font-extrabold">Cartões Genéricos</th>
                    <th className="p-6 font-heading font-black bg-tikin-orange">Ecossistema TIKIN</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Natureza do Saldo", "Conta de pagamento, livre uso", "Voucher de propósito específico"],
                    ["Liquidação ao Lojista", "D+30 (ou mais)", "Recebimento no ato"],
                    ["Taxa para o Lojista", "Até 12% + aluguel", "Taxa clara de 4,5%"],
                    ["Controle Anti-Desvio", "Limitado pelo MCC", "Regras de circuito fechado e CNAE"],
                  ].map(([c, g, t]) => (
                    <tr key={c} className="border-b border-tikin-navy/5">
                      <td className="p-5 px-6 font-bold">{c}</td>
                      <td className="p-5 px-6 text-tikin-navy/60">{g}</td>
                      <td className="p-5 px-6 font-extrabold text-tikin-orange bg-tikin-orange/5">{t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-5">
          <h2 className="text-[2rem] font-heading font-black mb-3 text-tikin-navy text-center">
            FAQ Jurídico-Comercial
          </h2>
          <p className="text-center text-[0.95rem] text-tikin-navy/60 mb-10">
            Entenda os detalhes operacionais e de compliance.
          </p>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-heading font-extrabold text-tikin-navy mt-5 border-b-2 border-tikin-navy/5 pb-2">
              🏢 Para Emitentes (Empresas)
            </h3>
            <FaqItem
              q="O saldo distribuído possui risco trabalhista ou é considerado &quot;dinheiro&quot;?"
              a={<>Não. A TIKIN atua por meio de um modelo desenhado para reduzir riscos. Distribuímos um <strong>voucher de propósito específico</strong>, operado em circuito fechado. Não é "saldo livre", "dinheiro digital" e não permite transferência entre usuários. Como só pode ser utilizado em categorias previamente definidas na rede credenciada, auxilia a empresa no cumprimento das regras de não-substituição salarial.</>}
            />
            <FaqItem
              q="O que acontece com o saldo do usuário se não for utilizado no prazo?"
              a="Quando definido previamente pelo emitente, os valores não utilizados dentro do prazo de validade podem retornar ao fundo da empresa. Essas regras são condições previamente informadas e fazem parte do programa contratado. Se aplicável, a TIKIN aplica uma taxa sobre o valor efetivamente recuperado."
            />

            <h3 className="text-lg font-heading font-extrabold text-tikin-orange mt-8 border-b-2 border-tikin-orange/10 pb-2">
              🏪 Para Lojistas Parceiros
            </h3>
            <FaqItem
              accent="orange"
              q="Como e quando eu recebo minhas vendas?"
              a="A liquidação ao lojista parceiro ocorre no ato da transação aprovada (salvo condições específicas contratadas). A taxa cobrada é transparente e fixa em 4,5% para o recebimento."
            />
            <FaqItem
              accent="orange"
              q={`Eu posso entregar o "troco" ou converter o voucher em dinheiro para o cliente?`}
              a={<><strong>Absolutamente não.</strong> É expressamente vedado o uso da plataforma para fracionamento artificial, simulação de vendas, troca por dinheiro ou concessão de troco. Nossa infraestrutura monitora transações para prevenção a fraudes e o descumprimento gera exclusão da rede credenciada.</>}
            />

            <h3 className="text-lg font-heading font-extrabold text-tikin-navy/60 mt-8 border-b-2 border-tikin-navy/5 pb-2">
              👤 Para Beneficiários
            </h3>
            <FaqItem
              accent="muted"
              q="Posso sacar o saldo ou transferir para a conta de um amigo?"
              a="Não. O saldo disponível na TIKIN é de uso estritamente condicionado ao seu CPF e só pode ser utilizado para pagar serviços na nossa rede credenciada, lendo o QR Code do lojista."
            />
          </div>
        </section>
      </div>
    </SitePage>
  );
}
