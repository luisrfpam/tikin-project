import SitePage from "@/components/site/SitePage";

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="text-2xl font-heading font-extrabold text-tikin-navy border-b-2 border-tikin-navy/5 pb-3 mb-5">
      {n}. {title}
    </h2>
    <div className="text-tikin-navy/80 leading-[1.8] space-y-3">{children}</div>
  </section>
);

const Bullet = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <li>
    <strong>{title}</strong> {children}
  </li>
);

export default function Security() {
  return (
    <SitePage>
      <div className="bg-[#F7F8FA] min-h-screen py-20 px-5">
        <div className="max-w-[1000px] mx-auto bg-white p-8 md:p-16 rounded-3xl shadow-card">
          <h1 className="text-[2.8rem] font-heading font-black text-tikin-navy mb-4 tracking-tight leading-[1.1]">
            Segurança para quem distribui, usa e recebe.
          </h1>
          <p className="text-tikin-navy/60 text-lg mb-10 leading-relaxed">
            A TIKIN foi desenhada para proteger o fluxo do valor com controle restrito, rastreabilidade e regras claras em circuito fechado.
          </p>

          <div className="flex flex-col gap-10">
            <div className="p-6 border-l-4 border-tikin-navy bg-[#fdfdfd]">
              <p className="text-tikin-navy text-lg font-bold font-heading leading-relaxed">
                "A TIKIN é uma infraestrutura tecnológica de vouchers de propósito específico, operada em circuito fechado, com uso restrito a regras definidas pelo emitente e aceitação limitada a lojistas credenciados e compatíveis com o propósito do voucher."
              </p>
            </div>

            <Section n="1" title="Pilares Fundamentais de Segurança e Compliance">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  ["Controle Absoluto", "O emitente define regras, validade, categorias e público elegível."],
                  ["Rastreabilidade", "Cada transação aprovada gera registro para acompanhamento e auditoria."],
                  ["Rede Credenciada", "O voucher só pode ser usado em lojistas aprovados e compatíveis com o propósito."],
                  ["Circuito Fechado", "O valor não circula livremente: ele segue regras, prazo e finalidade."],
                ].map(([t, d]) => (
                  <div key={t} className="p-4 border border-tikin-navy/5 rounded-xl">
                    <strong className="block text-tikin-navy mb-1">{t}</strong>
                    <span className="text-tikin-navy/70 text-[0.95rem]">{d}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section n="2" title="Política Pública de Segurança da Informação">
              <p>O ambiente da TIKIN segue rígidos controles técnicos, garantindo estabilidade e proteção. Nossos principais pilares incluem:</p>
              <ul className="ml-5 list-square space-y-2">
                <Bullet title="Autenticação Segura:">Sistemas de login em múltiplas camadas e verificação local.</Bullet>
                <Bullet title="Criptografia em Trânsito:">Todos os dados transitam por protocolos altamente seguros (TLS/SSL).</Bullet>
                <Bullet title="Controle de Acesso (RBAC):">Permissões granulares pelo Princípio do Menor Privilégio.</Bullet>
                <Bullet title="Logs e Monitoramento:">Registro inalterável de todas as ações sensíveis para auditoria contínua.</Bullet>
                <Bullet title="Segregação e Backups:">Ambientes totalmente isolados (Homologação x Produção) com rotinas de backup geodistribuídas.</Bullet>
                <Bullet title="Gestão de Fornecedores:">Revisão rigorosa da postura de segurança de parceiros técnicos.</Bullet>
              </ul>
            </Section>

            <Section n="3" title="Política de Compliance e Integridade">
              <p>A TIKIN não é "só tecnologia", é uma operação estritamente controlada que busca mitigar riscos sistêmicos e prevenir a criminalidade financeira:</p>
              <ul className="ml-5 list-square space-y-2">
                <Bullet title="Prevenção a Fraude e PLD/FT:">Monitoramento ativo de transações suspeitas e verificação contínua contra Prevenção à Lavagem de Dinheiro (PLD).</Bullet>
                <Bullet title="KYC e KYB (Conheça seu Cliente/Empresa):">Análise criteriosa na ponta de uso e na ponta de aceite.</Bullet>
                <Bullet title="Validação Regrada de CNAE:">Cruzamento entre o propósito da verba corporativa e o serviço prestado pelo Lojista.</Bullet>
                <Bullet title="Canal de Denúncias e Sanções:">Ferramentas acessíveis para reportar uso indevido, com exclusão sumária da rede em casos confirmados.</Bullet>
              </ul>
            </Section>

            <Section n="4" title="Política de Onboarding de Lojistas">
              <p>O protocolo de entrada de novos parceiros comerciais é o maior escudo de blindagem da plataforma. O onboarding requer:</p>
              <ul className="ml-5 list-square space-y-2">
                <li>Coleta automatizada de CNPJ e verificação da situação cadastral ativa na Receita Federal.</li>
                <li>Análise do Contrato Social e poderes legítimos do Representante Legal.</li>
                <li>Validação do CNAE Principal e Secundários em relação às categorias permitidas pelo Emitente.</li>
                <li>Verificação em Listas Restritivas Nacionais e Internacionais e checagem de domicílio bancário associado à PJ.</li>
                <li>Aprovação condicionada a monitoramento contínuo e revalidação periódica.</li>
              </ul>
            </Section>

            <Section n="5" title="Política de Uso Aceitável">
              <p>Empregamos uma política dura e inegociável quanto ao uso do sistema. São estritamente proibidas:</p>
              <ul className="ml-5 list-square space-y-2">
                <li>Venda fictícia, simulação de compra, concessão de troco físico ou troca direta por dinheiro.</li>
                <li>Uso explícito da plataforma fora da categoria e da rede credenciada compatível.</li>
                <li>Transferência P2P (entre usuários finais).</li>
                <li>Fracionamento fraudulento de faturas e manipulação física ou digital do QR Code.</li>
                <li>Conluio arquitetado entre usuários e lojistas para burlar a validade da verba restrita.</li>
              </ul>
            </Section>

            <Section n="6" title="Governança: DPA (Acordo de Tratamento de Dados)">
              <p>A TIKIN assume posições contratuais precisas na matriz da LGPD, dependendo do fluxo processado, podendo figurar como operadora, suboperadora ou controladora autônoma. O DPA documenta:</p>
              <ul className="ml-5 list-square space-y-2">
                <li>Objeto do tratamento, finalidades delimitadas e garantias técnicas oferecidas ao Emitente.</li>
                <li>Limitação de Suboperadores apenas aos estritamente necessários para liquidação e infraestrutura de nuvem, sob aval do Emitente.</li>
                <li>Procedimentos de exclusão/devolução de dados ao final do contrato corporativo.</li>
              </ul>
            </Section>

            <Section n="7" title="Relatório de Impacto à Proteção de Dados (RIPD/DPIA)">
              <p>Desenvolvemos nosso próprio Relatório de Impacto avaliando de forma perene os riscos sistêmicos ao tratar dados financeiros (saldos, transações), dados de georreferência e vínculos trabalhistas repassados pelo Emitente. O RIPD demonstra as medidas de mitigação, retenção limitada e garantia de proporcionalidade aplicadas pela TIKIN.</p>
            </Section>

            <Section n="8" title="Gestão e Procedimento de Resposta a Incidentes">
              <p>Conduzimos nossos protocolos baseados no regulamento da ANPD (Resolução nº 15/2024). Possuímos um fluxo ágil para:</p>
              <ul className="ml-5 list-square space-y-2">
                <Bullet title="Detectar e Conter:">Isolamento automático de redes em caso de anomalias.</Bullet>
                <Bullet title="Classificar e Avaliar:">Determinação do nível de risco aos titulares e operação da empresa Emitente.</Bullet>
                <Bullet title="Comunicar:">Notificação formal à Autoridade Nacional e aos titulares dentro dos prazos da lei, quando configurado prejuízo e dano relevante.</Bullet>
                <Bullet title="Remediar e Atualizar:">Aplicação contínua das lições aprendidas nos controles lógicos.</Bullet>
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </SitePage>
  );
}
