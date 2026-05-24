# Offramp Retry Cron (GitHub Actions)

Este documento resume a automacao de retry para ordens de off-ramp com status `failed`.

## O que foi implementado

- Edge Function: `offramp-retry-failed`
  - Local: `supabase/functions/offramp-retry-failed/index.ts`
  - Objetivo: reprocessar `offramp_orders` com status `failed`.
- Workflow cron: `.github/workflows/offramp-retry-cron.yml`
  - Agenda: a cada 10 minutos.
  - Acao: chama `offramp-retry-failed` com lote de retry.
- Auto-healing no front do emitente:
  - Tela `EmissorBlockchain` dispara retry best-effort ao carregar.

## O que voce precisa configurar

No repositorio GitHub (Settings -> Secrets and variables -> Actions), crie estes secrets:

1. `SUPABASE_FUNCTION_URL`
   - Exemplo: `https://oeevjolpgqafqzvnviqs.supabase.co/functions/v1`
2. `SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`

Sem esses 3 secrets, o workflow cron nao consegue executar.

## Como validar rapidamente

1. Abra Actions no GitHub e rode manualmente o workflow `Offramp Retry Cron` (workflow_dispatch).
2. Verifique os logs do job e confirme retorno JSON com campos:
   - `retried`
   - `succeeded`
   - `failed`
   - `skipped`
3. Confira na tabela `offramp_orders` se houve mudanca de status para ordens antes falhas.
4. Confira na tela do Emitente se os ciclos pendentes foram fechados ou atualizados com falha explicita.

## Sobre gitignore desta parte

Se voce quiser manter esse workflow fora de versao (apenas local), use no `.gitignore`:

```gitignore
.github/workflows/offramp-retry-cron.yml
```

Importante: se o arquivo ja foi commitado anteriormente, o gitignore sozinho nao remove o rastreamento. Execute:

```bash
git rm --cached .github/workflows/offramp-retry-cron.yml
```

Depois, faca commit da remocao do indice.
