// Issues TESOURO asset from the master/platform wallet to an issuer's own
// Stellar wallet on Testnet. Funds the destination account via Friendbot,
// creates the TESOURO trustline if missing, and then submits the payment.
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

async function ensureAccount(server: Horizon.Server, publicKey: string) {
  try {
    return await server.loadAccount(publicKey);
  } catch (_e) {
    // fund via friendbot
    const r = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
    if (!r.ok) throw new Error(`Friendbot failed: ${await r.text()}`);
    // small wait for horizon to index
    await new Promise(res => setTimeout(res, 1500));
    return await server.loadAccount(publicKey);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const masterSecret = Deno.env.get("STELLAR_SECRET_KEY")!;
    const body = await req.json();
    const { issuer_id, amount, internal_id } = body as { issuer_id: string; amount: number; internal_id?: string };
    if (!issuer_id || !(amount > 0)) {
      return new Response(JSON.stringify({ error: "issuer_id e amount obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    const { data: issuer } = await admin
      .from("issuers")
      .select("id")
      .eq("id", issuer_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!issuer) {
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

    // 1) Ensure issuer account exists (funded by friendbot on first use)
    const issuerAcc = await ensureAccount(server, issuerKp.publicKey());

    // 2) Ensure trustline to TESOURO
    const hasTrust = issuerAcc.balances.some((b: any) =>
      b.asset_type !== "native" && b.asset_code === ASSET_CODE && b.asset_issuer === master.publicKey()
    );
    if (!hasTrust) {
      const fee = await server.fetchBaseFee();
      const trustTx = new TransactionBuilder(issuerAcc, {
        fee: String(fee),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.changeTrust({ asset, limit: "1000000000" }))
        .setTimeout(60)
        .build();
      trustTx.sign(issuerKp);
      await server.submitTransaction(trustTx);
    }

    // 3) Payment master -> issuer wallet (TESOURO 1:1 to BRL units)
    const masterAcc = await server.loadAccount(master.publicKey());
    const fee2 = await server.fetchBaseFee();
    const payTx = new TransactionBuilder(masterAcc, {
      fee: String(fee2),
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination: issuerKp.publicKey(),
        asset,
        amount: Number(amount).toFixed(7),
      }))
      .addMemo(Memo.text(`onramp:${(internal_id || "").slice(0, 21)}`))
      .setTimeout(60)
      .build();
    payTx.sign(master);
    // Compute the canonical tx hash from the signed envelope BEFORE submitting,
    // so we always store the exact hash of the master→issuer TESOURO payment.
    const txHash = payTx.hash().toString("hex");
    const result = await server.submitTransaction(payTx);
    const hash = (result as any).hash || txHash;

    return new Response(JSON.stringify({
      success: true,
      hash,
      from: master.publicKey(),
      to: issuerKp.publicKey(),
      issuer_wallet: issuerKp.publicKey(),
      asset: { code: ASSET_CODE, issuer: master.publicKey() },
      amount: Number(amount),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const detail = e?.response?.data?.extras?.result_codes
      ? JSON.stringify(e.response.data.extras.result_codes)
      : String(e?.message ?? e);
    console.error("stellar-issue-tesouro", detail);
    return new Response(JSON.stringify({ success: false, error: detail }), { status: 500, headers: corsHeaders });
  }
});
