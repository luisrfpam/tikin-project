// Backfills Stellar Testnet registrations for existing mock records.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
} from 'npm:stellar-sdk@12.3.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const PUBLIC_KEY = 'GA77ZOQA43YJIS6NF26UIRB2MH6N4ZMF277XCQSVDNT5YPZQPWPAV27A';

type EntityType = 'voucher' | 'transaction' | 'charge' | 'issuer_funds' | 'issuer_beneficiary';

const ENTITIES: Record<EntityType, { table: string; column: string; amountCol?: string; issuerCol?: string; op: string }> = {
  voucher: { table: 'vouchers', column: 'stellar_tx_hash', amountCol: 'value', issuerCol: 'issuer_id', op: 'voucher.create' },
  transaction: { table: 'transactions', column: 'stellar_tx_hash', amountCol: 'amount', op: 'voucher.pay' },
  charge: { table: 'charges', column: 'stellar_tx_hash', amountCol: 'amount', op: 'charge.create' },
  issuer_funds: { table: 'issuer_funds', column: 'last_stellar_tx_hash', amountCol: 'monthly_budget', issuerCol: 'issuer_id', op: 'funds.set_budget' },
  issuer_beneficiary: { table: 'issuer_beneficiaries', column: 'stellar_tx_hash', issuerCol: 'issuer_id', op: 'beneficiary.link' },
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const maxItems = Number(url.searchParams.get('max') ?? '20');
  const timeBudgetMs = Number(url.searchParams.get('time_ms') ?? '110000');
  const started = Date.now();

  const secret = Deno.env.get('STELLAR_SECRET_KEY');
  if (!secret) {
    return new Response(JSON.stringify({ error: 'STELLAR_SECRET_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const keypair = Keypair.fromSecret(secret);
  const server = new Horizon.Server(HORIZON_URL);

  let processed = 0;
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const [entityType, cfg] of Object.entries(ENTITIES) as [EntityType, typeof ENTITIES[EntityType]][]) {
    if (processed >= maxItems || Date.now() - started > timeBudgetMs) break;

    const remaining = maxItems - processed;
    const cols = ['id', cfg.column, cfg.amountCol, cfg.issuerCol].filter(Boolean).join(',');
    const { data: rows, error } = await supabase
      .from(cfg.table)
      .select(cols)
      .is(cfg.column, null)
      .limit(remaining);

    if (error) { errors.push(`${entityType}: ${error.message}`); continue; }
    if (!rows || rows.length === 0) continue;

    for (const row of rows as any[]) {
      if (Date.now() - started > timeBudgetMs) break;
      processed++;

      const internalId = row.id;
      const amount = cfg.amountCol ? Number(row[cfg.amountCol] ?? 0) : 0;
      const issuerId = cfg.issuerCol ? row[cfg.issuerCol] ?? null : null;

      // Idempotency
      const { data: existing } = await supabase
        .from('blockchain_transactions')
        .select('stellar_tx_hash')
        .eq('internal_id', internalId)
        .eq('operation', cfg.op)
        .eq('status', 'success')
        .maybeSingle();

      if (existing?.stellar_tx_hash) {
        await supabase.from(cfg.table).update({ [cfg.column]: existing.stellar_tx_hash }).eq('id', internalId);
        success++;
        continue;
      }

      const memoHex = await sha256Hex(`${internalId}|${amount}`);
      let hash: string | null = null;
      let ledger: number | null = null;
      let status = 'failed';
      let errorMsg: string | null = null;

      try {
        const account = await server.loadAccount(keypair.publicKey());
        const fee = await server.fetchBaseFee();
        // Assina e valida a transacao especificamente na Stellar Testnet durante o backfill dos registros antigos.
        const tx = new TransactionBuilder(account, { fee: String(fee), networkPassphrase: Networks.TESTNET })
          .addOperation(Operation.payment({ destination: PUBLIC_KEY, asset: Asset.native(), amount: '0.0000001' }))
          .addMemo(Memo.hash(memoHex))
          .setTimeout(60)
          .build();
        tx.sign(keypair);
        const result = await server.submitTransaction(tx);
        hash = (result as any).hash;
        ledger = (result as any).ledger ?? null;
        status = 'success';
        success++;
      } catch (e: any) {
        errorMsg = e?.response?.data?.extras?.result_codes
          ? JSON.stringify(e.response.data.extras.result_codes)
          : String(e?.message ?? e);
        failed++;
        errors.push(`${entityType}/${internalId}: ${errorMsg}`);
      }

      await supabase.from('blockchain_transactions').insert({
        internal_id: internalId,
        entity_type: entityType,
        operation: cfg.op,
        amount,
        stellar_tx_hash: hash,
        stellar_ledger: ledger,
        status,
        error: errorMsg,
        issuer_id: issuerId,
        memo_hash: memoHex,
      });

      if (status === 'success' && hash) {
        await supabase.from(cfg.table).update({ [cfg.column]: hash }).eq('id', internalId);
      }
    }
  }

  return new Response(
    JSON.stringify({ processed, success, failed, elapsed_ms: Date.now() - started, errors: errors.slice(0, 10) }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
