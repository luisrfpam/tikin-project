// Burns TESOURO from an issuer's Stellar wallet by sending it back to the
// master (asset issuer). In Stellar, sending an asset to its issuer destroys it.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
} from "npm:stellar-sdk@12.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const ASSET_CODE = "TESOURO";

async function decryptSecret(b64: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBuf = await crypto.subtle.digest("SHA-256", enc.encode(key));
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, { name: "AES-GCM" }, false, ["decrypt"]);
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ct);
  return new TextDecoder().decode(pt);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalServiceKey = req.headers.get("x-internal-service-key");
    const isInternalServiceCall = !!internalServiceKey && internalServiceKey === serviceKey;

    if (!authHeader && !isInternalServiceCall) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });

    let user: { id: string } | null = null;
    if (!isInternalServiceCall) {
      const { data, error: userErr } = await userClient.auth.getUser();
      if (userErr || !data.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      user = { id: data.user.id };
    }

    const masterSecret = Deno.env.get("STELLAR_SECRET_KEY")!;
    const { issuer_id, amount, internal_id, transaction_id } = await req.json() as {
      issuer_id: string;
      amount: number;
      internal_id?: string;
      transaction_id?: string;
    };
    if (!issuer_id || !(amount > 0)) {
      return new Response(JSON.stringify({ error: "issuer_id e amount obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    let authorized = false;
    if (isInternalServiceCall) {
      // Internal calls are only accepted when tied to an existing offramp order.
      if (!internal_id || !transaction_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
      const { data: order } = await admin
        .from("offramp_orders")
        .select("id, issuer_id, transaction_id, status")
        .eq("id", internal_id)
        .eq("transaction_id", transaction_id)
        .maybeSingle();
      authorized = !!order && order.issuer_id === issuer_id && ["pending", "burning"].includes(order.status);
    } else {
      const { data: issuer } = await admin
        .from("issuers")
        .select("id")
        .eq("id", issuer_id)
        .eq("user_id", user!.id)
        .maybeSingle();
      authorized = !!issuer;
    }

    if (!authorized && !isInternalServiceCall) {
      // Beneficiary path: allow burn only when tied to its own pending offramp order.
      if (!internal_id || !transaction_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }

      const { data: order } = await admin
        .from("offramp_orders")
        .select("id, issuer_id, transaction_id, voucher_id, status")
        .eq("id", internal_id)
        .eq("transaction_id", transaction_id)
        .maybeSingle();
      if (!order || order.issuer_id !== issuer_id || !["pending", "burning"].includes(order.status)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }

      const { data: voucher } = await admin
        .from("vouchers")
        .select("id, issuer_id, beneficiary_id")
        .eq("id", order.voucher_id)
        .maybeSingle();
      if (!voucher || voucher.issuer_id !== issuer_id || voucher.beneficiary_id !== user!.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }

      authorized = true;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { data: wallet } = await admin
      .from("issuer_stellar_wallets")
      .select("public_key, secret_encrypted")
      .eq("issuer_id", issuer_id)
      .maybeSingle();
    if (!wallet) return new Response(JSON.stringify({ error: "Wallet do emissor não encontrada" }), { status: 404, headers: corsHeaders });

    const master = Keypair.fromSecret(masterSecret);
    const issuerSecret = await decryptSecret(wallet.secret_encrypted, masterSecret);
    const issuerKp = Keypair.fromSecret(issuerSecret);
    const server = new Horizon.Server(HORIZON_URL);
    const asset = new Asset(ASSET_CODE, master.publicKey());

    const issuerAcc = await server.loadAccount(issuerKp.publicKey());
    // Validate balance
    const bal = issuerAcc.balances.find((b: any) =>
      b.asset_type !== "native" && b.asset_code === ASSET_CODE && b.asset_issuer === master.publicKey()
    );
    const available = Number(bal?.balance ?? 0);
    if (available < Number(amount)) {
      const err = `Saldo TESOURO insuficiente na carteira do emissor (disponível ${available})`;
      return new Response(JSON.stringify({ success: false, error: err }), { status: 400, headers: corsHeaders });
    }

    const fee = await server.fetchBaseFee();
    const tx = new TransactionBuilder(issuerAcc, {
      fee: String(fee),
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination: master.publicKey(), // sending back to asset issuer => burn
        asset,
        amount: Number(amount).toFixed(7),
      }))
      .addMemo(Memo.text(`offramp:${(internal_id || "").slice(0, 20)}`))
      .setTimeout(60)
      .build();
    tx.sign(issuerKp);
    const txHash = tx.hash().toString("hex");
    const result = await server.submitTransaction(tx);
    const hash = (result as any).hash || txHash;

    // Log to blockchain_transactions
    await admin.from("blockchain_transactions").insert({
      operation: "offramp_burn",
      amount: Number(amount),
      stellar_tx_hash: hash,
      stellar_ledger: (result as any).ledger ?? null,
      status: "success",
      issuer_id,
      internal_id: internal_id || crypto.randomUUID(),
      entity_type: "offramp_order",
    });

    return new Response(JSON.stringify({
      success: true,
      hash,
      from: issuerKp.publicKey(),
      to: master.publicKey(),
      amount: Number(amount),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const detail = e?.response?.data?.extras?.result_codes
      ? JSON.stringify(e.response.data.extras.result_codes)
      : String(e?.message ?? e);
    console.error("stellar-burn-tesouro", detail);
    return new Response(JSON.stringify({ success: false, error: detail }), { status: 500, headers: corsHeaders });
  }
});
