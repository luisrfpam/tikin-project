# Reset de Banco em DEV (mantendo apenas admin TKIN)

Este guia documenta o procedimento usado para limpar a base de dados de desenvolvimento no Supabase, removendo usuários/cadastros/transações e mantendo apenas o admin TKIN.

## Escopo

- Ambiente alvo: projeto Supabase **linked** (não local)
- Resultado esperado:
  - Somente 1 usuário no `auth.users` (admin TKIN)
  - Tabelas de dados zeradas
  - Catálogos preservados (`voucher_categories`, `voucher_statuses`)
  - `tikin_admins` com apenas 1 registro ativo

## Pré-requisitos

- Supabase CLI disponível (via `npx supabase`)
- Projeto já linkado (`supabase/.temp/project-ref`)
- Confirme que o alvo é DEV antes de executar

## 1) Validar alvo antes da limpeza

```powershell
Get-Location
Test-Path .\supabase
if (Test-Path .\supabase\.temp\project-ref) { Get-Content .\supabase\.temp\project-ref }
npx supabase --version
```

Opcional para baseline:

```powershell
npx supabase db query --linked "select count(*) as total_users, count(*) filter (where lower(email)=lower('tikinappbr@gmail.com')) as admin_users from auth.users;"

npx supabase db query --linked "select 'profiles' as table_name, count(*) as rows from public.profiles union all select 'user_roles', count(*) from public.user_roles union all select 'transactions', count(*) from public.transactions union all select 'vouchers', count(*) from public.vouchers union all select 'issuers', count(*) from public.issuers union all select 'establishments', count(*) from public.establishments union all select 'onramp_orders', count(*) from public.onramp_orders union all select 'offramp_orders', count(*) from public.offramp_orders;"
```

## 2) Preservar admin e limpar usuários

1. Garante admin ativo em `public.tikin_admins`
2. Remove outros admins da tabela administrativa
3. Remove todos os usuários de `auth.users`, exceto o admin

```powershell
npx supabase db query --linked "insert into public.tikin_admins (email, active) values ('tikinappbr@gmail.com', true) on conflict (email) do update set active = true, updated_at = now();"

npx supabase db query --linked "delete from public.tikin_admins where lower(email) <> lower('tikinappbr@gmail.com');"

npx supabase db query --linked "delete from auth.users where lower(email) <> lower('tikinappbr@gmail.com');"
```

## 3) Truncar tabelas de dados

Executar os `TRUNCATE` abaixo (cada comando separado):

```powershell
npx supabase db query --linked "truncate table public.audit_logs restart identity cascade;"
npx supabase db query --linked "truncate table public.blockchain_transactions restart identity cascade;"
npx supabase db query --linked "truncate table public.charges restart identity cascade;"
npx supabase db query --linked "truncate table public.establishments restart identity cascade;"
npx supabase db query --linked "truncate table public.etherfuse_customers restart identity cascade;"
npx supabase db query --linked "truncate table public.favorites restart identity cascade;"
npx supabase db query --linked "truncate table public.issuer_beneficiaries restart identity cascade;"
npx supabase db query --linked "truncate table public.issuer_funds restart identity cascade;"
npx supabase db query --linked "truncate table public.issuer_stellar_wallets restart identity cascade;"
npx supabase db query --linked "truncate table public.issuers restart identity cascade;"
npx supabase db query --linked "truncate table public.merchant_pix_keys restart identity cascade;"
npx supabase db query --linked "truncate table public.offramp_orders restart identity cascade;"
npx supabase db query --linked "truncate table public.onboarding_requests restart identity cascade;"
npx supabase db query --linked "truncate table public.onramp_orders restart identity cascade;"
npx supabase db query --linked "truncate table public.profiles restart identity cascade;"
npx supabase db query --linked "truncate table public.transactions restart identity cascade;"
npx supabase db query --linked "truncate table public.user_roles restart identity cascade;"
npx supabase db query --linked "truncate table public.vouchers restart identity cascade;"
```

## 4) Validar resultado pós-limpeza

```powershell
npx supabase db query --linked "select count(*) as total_users, count(*) filter (where lower(email)=lower('tikinappbr@gmail.com')) as admin_users from auth.users;"

npx supabase db query --linked "select tablename, (xpath('/row/cnt/text()', query_to_xml(format('select count(*) as cnt from public.%I', tablename), false, true, '')))[1]::text::bigint as rows from pg_tables where schemaname='public' order by tablename;"
```

Esperado:

- `auth.users`: `total_users = 1` e `admin_users = 1`
- `public.tikin_admins`: `1`
- Tabelas de dados: `0`
- Catálogos:
  - `voucher_categories` (mantido)
  - `voucher_statuses` (mantido)

## Observações importantes

- Este procedimento é destrutivo. Execute apenas em DEV.
- `npx supabase db query --linked` pode rejeitar bloco `DO $$ ... $$` em alguns cenários. Preferir comandos SQL simples por etapa (`DELETE`/`TRUNCATE`) como neste guia.
- Se necessário, adapte o e-mail admin preservado no comando (`tikinappbr@gmail.com`).
