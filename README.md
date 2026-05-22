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

| Operação | Descrição | Payload para hash/memo |
|----------|-----------|-------------------------|
| `create_voucher` | Emissão de voucher com saldo para beneficiário | `internal_id=voucher.id`, `operation=create_voucher`, `amount=valor do voucher` (disparada em **ADICIONAR SALDO (CPF)**) |
| `pay_voucher` | Pagamento realizado pelo beneficiário | `internal_id=transaction.id`, `operation=pay_voucher`, `amount=valor da fatia paga` |
| `allocate_budget` | Alocação de orçamento mensal pelo emitente | `internal_id=issuer_funds.id`, `operation=allocate_budget`, `amount=orçamento mensal` |
| `update_budget` | Edição de orçamento ou categorias existentes | `internal_id=issuer_funds.id`, `operation=update_budget`, `amount=orçamento mensal atualizado` |
| `link_beneficiary` | Vinculação do beneficiário ao emissor (sem crédito de saldo) | `internal_id=issuer_beneficiary.id`, `operation=link_beneficiary`, `amount=0` (não enviado). Disparada em **NOVO BENEFICIÁRIO** e também em **ADICIONAR SALDO (CPF)** quando o vínculo ainda não existe |
| `create_beneficiary` | Cadastro de novo usuário beneficiário na plataforma | `internal_id=issuer_beneficiary.id`, `operation=create_beneficiary`, `amount=0` (não enviado). Disparada apenas quando o CPF ainda não existe na base (fluxo **NOVO BENEFICIÁRIO**) |
| `charge` | Geração de cobrança pelo lojista | `internal_id=charge.id`, `operation=charge`, `amount=valor da cobrança` |
| `onramp_pix_settled` | PIX de entrada liquidado e convertido em TESOURO na carteira do emissor | Não usa `stellar-register`: hash é o `tx hash` da emissão TESOURO (`stellar-issue-tesouro`), com `internal_id=onramp_order.id` e `amount=amount_brl` |
| `offramp_burn` | Queima (burn) de TESOURO para iniciar liquidação PIX ao lojista | Não usa `stellar-register`: hash é o `tx hash` da transação de burn (`stellar-burn-tesouro`), com `internal_id=offramp_order.id` e `amount=tx.amount` |
| `offramp_pix_paid` | Liquidação PIX concluída para o lojista no fluxo de off-ramp | Não gera hash novo: reutiliza o hash do `offramp_burn`, com `internal_id=offramp_order.id` e `amount=tx.amount` |
| `offramp_failed` | Status de falha no fluxo de off-ramp (permite diagnóstico e reprocessamento) | Não registra hash próprio na Stellar; é apenas status operacional para monitoramento/reenvio |

Observação importante sobre as ações da tela de beneficiários:

- **NOVO BENEFICIÁRIO:** pode registrar `create_beneficiary` (se CPF novo) + `link_beneficiary` (vínculo com o emissor), sem emissão de voucher.
- **ADICIONAR SALDO (CPF):** registra `create_voucher` (com valor) e, se necessário, também `link_beneficiary` quando o beneficiário ainda não estava vinculado ao emissor.

### Como funciona:

1. Cada operação gera um registro interno com `internal_id` único
2. A edge function `stellar-register` monta uma transação Stellar com:
   - **Pagamento de 0.0000001 XLM** para a própria conta (custo mínimo)
   - **Memo hash** contendo o SHA-256 de `internal_id|operation|amount` (com `amount=0` quando não enviado)
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
- [Segurança](https://tikinapp.com.br/seguranca)

---

## 🌐 Links

- **Site:** [tikinapp.com.br](https://tikinapp.com.br)
- **Explorer Stellar:** [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)

---

**TIKIN Tecnologia** — Todos os direitos reservados.

---

## 🚢 Deploy com Dokploy

Este repositório já está preparado para deploy com **Dockerfile** no Dokploy:

- `Dockerfile` com build de produção (Vite) e runtime com Nginx
- `nginx.conf` com fallback para SPA (`/index.html`)
- `.dockerignore` para reduzir o contexto de build

### Passo a passo no Dokploy

1. Crie uma aplicação do tipo **Dockerfile**.
2. Conecte este repositório Git.
3. Configure a branch de deploy (ex.: `main`).
4. Configure a porta interna como `80`.
5. Na tela **Build Type** (igual à imagem), preencha:
   - **Build Type:** `Dockerfile`
   - **Docker File:** `Dockerfile`
   - **Docker Context Path:** `.`
   - **Docker Build Stage:** deixe vazio (ou `runtime`)
6. Em **Environment Variables** (Build/Runtime), adicione exatamente:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
   - `TIKIN_ADMIN_EMAIL`
   - `TIKIN_ADMIN_PASSWORD`
7. Configure domínio e TLS no Dokploy.
8. Execute o primeiro deploy.

### Valores para Supabase.com

- `VITE_SUPABASE_PROJECT_ID`: `PROJECT_REF` do projeto (ex.: `oeevjolpgqafqzvnviqs`)
- `VITE_SUPABASE_URL`: URL do projeto no formato `https://SEU_PROJECT_REF.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave **anon/publishable** do projeto Supabase
- `TIKIN_ADMIN_EMAIL`: e-mail administrativo definido por você
- `TIKIN_ADMIN_PASSWORD`: senha administrativa definida por você

> Não use `service_role` no frontend. Essa chave é sensível e deve ficar apenas no backend/edge functions.

### Observações importantes

- Como é um app Vite, variáveis `VITE_*` são embutidas no build.
- O `Dockerfile` já mapeia `TIKIN_ADMIN_EMAIL/PASSWORD` para `VITE_TIKIN_ADMIN_EMAIL/PASSWORD` durante o build.
- Se alterar qualquer `VITE_*`, faça novo deploy para refletir no frontend.
- Use `.env.dokploy.example` como referência para as chaves necessárias.
