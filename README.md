# TIKIN — Plataforma de Vouchers Digitais com Blockchain

A **TIKIN** é um ecossistema fintech que conecta empresas, colaboradores e estabelecimentos comerciais por meio de **vouchers digitais de propósito específico**, registrados de forma transparente e imutável na **Stellar Blockchain (Testnet)**.

---

## 🎯 O que é a TIKIN

A TIKIN atua como uma infraestrutura tecnológica de vouchers em **circuito fechado**, permitindo que empresas distribuam benefícios com regras próprias (categoria, geolocalização, validade) e que colaboradores utilizem esses valores apenas em lojistas credenciados compatíveis com o propósito do voucher.

Diferente de carteiras digitais de uso livre, a TIKIN garante que:
- O valor distribuído possui **uso restrito** às regras definidas pelo emitente
- As transações são **registradas on-chain** na Stellar, com rastreabilidade total
- O lojista recebe a **liquidação no ato** após a validação

---

## 👥 As Três Personas da Plataforma

### 1. 🏢 Emitente (Empresa)

O **emitente** é a empresa que distribui benefícios aos seus colaboradores.

**Principais funcionalidades:**
- Criar e gerenciar **orçamentos mensais** (fundo de benefícios)
- **Alocar saldos por categoria** (alimentação, transporte, saúde, etc.)
- **Vincular beneficiários** individualmente ou em lote via CSV
- Acompanhar **relatórios de utilização** em tempo real
- Visualizar **histórico blockchain** de todas as operações (criação de vouchers, pagamentos, alocações)

**Exemplo de uso:** Uma empresa aloca R$ 10.000 no fundo de alimentação, vincula 200 colaboradores e define que o saldo só pode ser usado em restaurantes e mercados credenciados.

---

### 2. 👤 Beneficiário (Colaborador)

O **beneficiário** é o colaborador que recebe o voucher digital para utilizar.

**Principais funcionalidades:**
- Acessar **carteira digital** com saldo por categoria
- Realizar **pagamento via QR Code** em lojistas credenciados
- Consultar **extrato detalhado** de transações
- Visualizar **rede de estabelecimentos** aceitos próximos à sua localização
- Receber notificações de saldo e validade

**Fluxo de pagamento:** O beneficiário abre o app, escaneia o QR Code gerado pelo lojista, confirma o valor e a transação é validada instantaneamente.

---

### 3. 🏪 Lojista (Estabelecimento)

O **lojista** é o estabelecimento credenciado que aceita os vouchers digitais.

**Principais funcionalidades:**
- Gerar **QR Code de cobrança** com o valor da venda
- Receber **liquidação no ato** diretamente na conta cadastrada
- Consultar **extrato de recebimentos** com detalhes de cada transação
- Acompanhar **saldo disponível** para transferência
- Validar transações com **segurança e rastreabilidade**

**Taxa:** 4,5% sobre cada transação, com liquidação instantânea.

---

## 🔗 Integração com Stellar Blockchain

A TIKIN utiliza a **Stellar Testnet** para registrar todas as operações críticas do ecossistema de vouchers. Isso garante **transparência, rastreabilidade e imutabilidade** dos dados.

### O que é registrado na blockchain:

| Operação | Descrição |
|----------|-----------|
| `create_voucher` | Criação de um novo voucher de benefício |
| `pay_voucher` | Pagamento realizado pelo beneficiário |
| `allocate_budget` | Alocação de orçamento mensal pelo emitente |
| `update_budget` | Edição de orçamento ou categorias existentes |
| `link_beneficiary` | Vinculação de beneficiário ao fundo da empresa |
| `create_beneficiary` | Cadastro de novo beneficiário na plataforma |
| `charge` | Geração de cobrança pelo lojista |

### Como funciona:

1. Cada operação gera um registro interno com `internal_id` único
2. A edge function `stellar-register` monta uma transação Stellar com:
   - **Pagamento de 0.0000001 XLM** para a própria conta (custo mínimo)
   - **Memo criptografado** contendo o hash SHA-256 do `internal_id` + valor
3. A transação é **assinada e submetida** à Stellar Testnet via Horizon
4. O **hash da transação** (`stellar_tx_hash`) é salvo no banco e exibido em todas as telas
5. Qualquer pessoa pode consultar a transação no **Stellar Explorer** pelo hash

### Chave pública Stellar:
```
GA77ZOQA43YJIS6NF26UIRB2MH6N4ZMF277XCQSVDNT5YPZQPWPAV27A
```

**Explorer:** [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)

### Benefícios da integração:

- **Auditoria pública:** Qualquer operação pode ser verificada on-chain
- **Imutabilidade:** Uma vez registrado, o hash não pode ser alterado
- **Transparência:** Emitentes, beneficiários e lojistas têm acesso ao mesmo registro
- **Compliance:** Suporte a requisitos regulatórios de rastreabilidade

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| **Build** | Vite 5 |
| **Backend** | Lovable Cloud (Supabase) |
| **Banco de Dados** | PostgreSQL + RLS (Row Level Security) |
| **Blockchain** | Stellar Testnet (SDK v12) |
| **Auth** | Supabase Auth (JWT + OAuth Google) |
| **Edge Functions** | Deno (Supabase Functions) |
| **Testes** | Vitest |

---

## 📂 Estrutura do Projeto

```
tikin-app/
├── src/
│   ├── pages/              # Páginas por persona
│   │   ├── emissor/        # Dashboard, fundos, beneficiários, blockchain
│   │   ├── beneficiario/   # Carteira, pagamento, extrato, perfil
│   │   ├── lojista/        # Receber, extrato, perfil
│   │   └── site/           # Landing, FAQ, termos, privacidade
│   ├── components/         # Componentes reutilizáveis
│   ├── lib/                # Utilitários, auth, helpers
│   └── integrations/       # Cliente Supabase
├── supabase/
│   └── functions/          # Edge Functions (Stellar, Auth, etc.)
├── public/                 # Assets estáticos (logos, ícones)
├── tailwind.config.ts      # Configuração do design system
└── index.html              # Entry point
```

---

## 🚀 Como Rodar

```bash
# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev

# Execute os testes
npm run test

# Build de produção
npm run build
```

---

## ⚖️ Modelo de Negócio

| Ator | Responsabilidade | Taxa |
|------|-----------------|------|
| **Emitente** | Define regras e distribui saldos | Taxa sobre saldo não utilizado (20% do valor recuperado) |
| **Beneficiário** | Utiliza vouchers conforme regras | Sem taxa |
| **Lojista** | Aceita vouchers e recebe liquidação | 4,5% por transação |

---

## 🔐 Segurança & Compliance

- **KYC/KYB:** Validação de lojistas por CNAE e documentação
- **LGPD:** Bases legais claras para processamento de dados
- **RLS:** Políticas de segurança em nível de linha no banco de dados
- **JWT:** Autenticação segura com tokens httpOnly
- **Anti-fraude:** Monitoramento de padrões suspeitos

---

## 📝 Documentação Legal

- [Termos de Uso](https://tikinapp.com.br/termos)
- [Política de Privacidade](https://tikinapp.com.br/privacidade)
- [Segurança](https://tikinapp.com.br/security)

---

## 🌐 Links

- **Site:** [tikinapp.com.br](https://tikinapp.com.br)
- **Explorer Stellar:** [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)

---

**TIKIN Tecnologia** — Todos os direitos reservados.
