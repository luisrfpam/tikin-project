import LegalPage from "@/components/site/LegalPage";

export default function Privacidade() {
  return (
    <LegalPage
      title="POLÍTICA DE PRIVACIDADE"
      body={[
        { h: "1. Coleta de Dados", p: "Coletamos apenas os dados necessários para a operação do circuito fechado de vouchers: CPF/CNPJ, e-mail, dados biométricos (token derivado, não a imagem) e dados de transação." },
        { h: "2. Uso de Dados", p: "Os dados são usados exclusivamente para autenticação, validação de regras de uso, liquidação financeira e auditoria regulatória, em conformidade com a LGPD." },
        { h: "3. Compartilhamento", p: "Compartilhamos dados apenas com parceiros operacionais (provedor de liquidação e blockchain para integridade) e autoridades quando legalmente exigido." },
        { h: "4. Direitos do Titular", p: "Você tem direito de acessar, corrigir, portar e solicitar exclusão dos seus dados. Contate dpo@tikinapp.com.br." },
        { h: "5. Retenção", p: "Logs de auditoria são retidos por 5 anos conforme regulação financeira. Demais dados pelo tempo da relação contratual." },
      ]}
    />
  );
}
