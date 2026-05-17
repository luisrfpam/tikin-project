// Registers an internal operation on Stellar Testnet and stores the resulting hash.
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

// Usa o endpoint Horizon da Stellar Testnet para submeter transacoes de registro sem tocar a rede principal.
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const PUBLIC_KEY = 'GA77ZOQA43YJIS6NF26UIRB2MH6N4ZMF277XCQSVDNT5YPZQPWPAV27A';

interface Body {
  internal_id: string;
  entity_type: 'voucher' | 'transaction' | 'issuer_funds' | 'issuer_beneficiary' | 'voucher_category' | 'charge';
  operation: string;
  amount?: number;
  issuer_id?: string;
}

const ENTITY_TABLE: Record<string, { table: string; column: string }> = {
  voucher: { table: 'vouchers', column: 'stellar_tx_hash' },
  transaction: { table: 'transactions', column: 'stellar_tx_hash' },
  issuer_funds: { table: 'issuer_funds', column: 'last_stellar_tx_hash' },
  issuer_beneficiary: { table: 'issuer_beneficiaries', column: 'stellar_tx_hash' },
  charge: { table: 'charges', column: 'stellar_tx_hash' },
};

async function sha256Hex(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const authHeader = req.headers.get('Authorization');
    let actorId: string | null = null;
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data } = await userClient.auth.getUser();
      actorId = data.user?.id ?? null;
    }

    const body = (await req.json()) as Body;
    if (!body.internal_id || !body.entity_type || !body.operation) {
      return new Response(JSON.stringify({ error: 'missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency
    const { data: existing } = await supabase
      .from('blockchain_transactions')
      .select('id, stellar_tx_hash, stellar_ledger, status')
      .eq('internal_id', body.internal_id)
      .eq('operation', body.operation)
      .eq('status', 'success')
      .maybeSingle();
    if (existing?.stellar_tx_hash) {
      return new Response(
        JSON.stringify({
          success: true,
          hash: existing.stellar_tx_hash,
          ledger: existing.stellar_ledger,
          cached: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const secret = Deno.env.get('STELLAR_SECRET_KEY');
    if (!secret) throw new Error('STELLAR_SECRET_KEY not configured');

    const memoPayload = `${body.internal_id}|${body.amount ?? 0}`;
    const memoBytes = await sha256Hex(memoPayload);
    const memoHex = Array.from(memoBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    const keypair = Keypair.fromSecret(secret);
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(keypair.publicKey());
    const fee = await server.fetchBaseFee();

    const tx = new TransactionBuilder(account, {
      fee: String(fee),
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: PUBLIC_KEY,
          asset: Asset.native(),
          amount: '0.0000001',
        })
      )
      .addMemo(Memo.hash(memoHex))
      .setTimeout(60)
      .build();

    tx.sign(keypair);

    let hash: string | null = null;
    let ledger: number | null = null;
    let status = 'failed';
    let errorMsg: string | null = null;

    try {
      // O hash oficial da transacao e gerado pela rede ao submeter o tx; em seguida ele e salvo em blockchain_transactions como stellar_tx_hash.
      const result = await server.submitTransaction(tx);
      hash = (result as any).hash;
      ledger = (result as any).ledger ?? null;
      status = 'success';
    } catch (e: any) {
      errorMsg = e?.response?.data?.extras?.result_codes
        ? JSON.stringify(e.response.data.extras.result_codes)
        : String(e?.message ?? e);
    }

    // Save record
    await supabase.from('blockchain_transactions').insert({
      internal_id: body.internal_id,
      entity_type: body.entity_type,
      operation: body.operation,
      amount: body.amount ?? null,
      stellar_tx_hash: hash,
      stellar_ledger: ledger,
      status,
      error: errorMsg,
      issuer_id: body.issuer_id ?? null,
      actor_id: actorId,
      memo_hash: memoHex,
    });

    // Update entity column (best-effort)
    if (status === 'success' && hash) {
      const map = ENTITY_TABLE[body.entity_type];
      if (map) {
        await supabase.from(map.table).update({ [map.column]: hash }).eq('id', body.internal_id);
      }
    }

    return new Response(
      JSON.stringify({ success: status === 'success', hash, ledger, error: errorMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('stellar-register error', e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
