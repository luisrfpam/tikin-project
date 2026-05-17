import LegalPage from "@/components/site/LegalPage";

export default function Termos() {
  return (
    <LegalPage
      title="TERMOS DE USO"
      body={[
        { h: "1. Objeto", p: "A TIKIN provê plataforma de vouchers de propósito específico em circuito fechado, conectando emissores, beneficiários e lojistas." },
        { h: "2. Cadastro", p: "O usuário garante a veracidade das informações fornecidas. Lojistas passam por validação CNAE." },
        { h: "3. Vouchers", p: "Vouchers são saldos de propósito específico, intransferíveis, com regras de uso definidas pelo emissor (categoria, geofence, validade)." },
        { h: "4. Liquidação", p: "Pagamentos são liquidados via Blockchain. A TIKIN cobra taxa fixa de 4,5% por transação ao lojista." },
        { h: "5. Saldo Expirado", p: "Saldo não utilizado dentro do prazo retorna ao fundo da empresa emissora. A TIKIN cobra apenas sobre o valor recuperado." },
        { h: "6. Foro", p: "Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões relacionadas a estes termos." },
      ]}
    />
  );
}
