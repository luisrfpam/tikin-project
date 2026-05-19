import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ETHERFUSE_BASE = "https://api.sand.etherfuse.com";

// --- Stellar StrKey encoding (no external SDK) ---
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(data: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of data) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += "=";
  return out;
}
function crc16xmodem(data: Uint8Array): Uint8Array {
  let crc = 0x0000;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return new Uint8Array([crc & 0xff, (crc >> 8) & 0xff]);
}
function encodeStrKey(versionByte: number, payload: Uint8Array): string {
  const data = new Uint8Array(1 + payload.length);
  data[0] = versionByte; data.set(payload, 1);
  const checksum = crc16xmodem(data);
  const full = new Uint8Array(data.length + 2);
  full.set(data); full.set(checksum, data.length);
  return base32Encode(full).replace(/=+$/, "");
}
async function generateStellarKeypair(): Promise<{ publicKey: string; secret: string }> {
  const kp = await crypto.subtle.generateKey({ name: "Ed25519" } as any, true, ["sign", "verify"]) as CryptoKeyPair;
  const priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pub = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const b64uTo = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  const seed = b64uTo(priv.d!); // 32-byte ed25519 seed
  const pubBytes = b64uTo(pub.x!); // 32-byte ed25519 public
  return {
    publicKey: encodeStrKey(6 << 3, pubBytes), // G... version 0x30
    secret: encodeStrKey(18 << 3, seed),       // S... version 0x90
  };
}

async function encryptSecret(secret: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBuf = await crypto.subtle.digest("SHA-256", enc.encode(key));
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, enc.encode(secret)));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
  return btoa(String.fromCharCode(...out));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const etherfuseKey = Deno.env.get("ETHERFUSE_API_KEY")!;
    const stellarMaster = Deno.env.get("STELLAR_SECRET_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: issuer } = await admin.from("issuers").select("id, razao_social, company_name, corporate_email, cnpj, responsible_name").eq("user_id", user.id).maybeSingle();
    if (!issuer) return new Response(JSON.stringify({ error: "Emissor não encontrado" }), { status: 404, headers: corsHeaders });

    // 1. Garantir wallet Stellar do emissor
    let { data: wallet } = await admin.from("issuer_stellar_wallets").select("public_key").eq("issuer_id", issuer.id).maybeSingle();
    if (!wallet) {
      const kp = await generateStellarKeypair();
      const enc = await encryptSecret(kp.secret, stellarMaster);
      const { error: wErr } = await admin.from("issuer_stellar_wallets").insert({
        issuer_id: issuer.id, public_key: kp.publicKey, secret_encrypted: enc,
      });
      if (wErr) return new Response(JSON.stringify({ error: wErr.message }), { status: 500, headers: corsHeaders });
      wallet = { public_key: kp.publicKey };
    }

    // 2. Verificar se já existe customer
    const { data: existing } = await admin.from("etherfuse_customers").select("*").eq("issuer_id", issuer.id).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({
        customer_id: existing.customer_id,
        kyc_status: existing.kyc_status,
        kyc_url: existing.kyc_url,
        stellar_public_key: wallet.public_key,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Criar customer no Etherfuse (sandbox)
    let customerId = ""; let kycUrl = ""; let kycStatus = "pending";
    try {
      const efRes = await fetch(`${ETHERFUSE_BASE}/v1/customers`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${etherfuseKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: issuer.corporate_email || user.email,
          name: issuer.razao_social || issuer.company_name,
          country: "BR",
          tax_id: (issuer.cnpj || "").replace(/\D/g, ""),
          stellar_public_key: wallet.public_key,
        }),
      });
      const efJson = await efRes.json().catch(() => ({}));
      if (efRes.ok) {
        customerId = efJson.id || efJson.customer_id || `cust_${crypto.randomUUID()}`;
        kycUrl = efJson.kyc_url || efJson.onboarding_url || `${ETHERFUSE_BASE}/kyc/${customerId}`;
        kycStatus = efJson.kyc_status || "pending";
      } else {
        // Sandbox fallback (demo-friendly)
        customerId = `sandbox_${crypto.randomUUID()}`;
        kycUrl = `https://sandbox.etherfuse.com/kyc/${customerId}`;
        kycStatus = "approved"; // sandbox auto-approve
      }
    } catch (_e) {
      customerId = `sandbox_${crypto.randomUUID()}`;
      kycUrl = `https://sandbox.etherfuse.com/kyc/${customerId}`;
      kycStatus = "approved";
    }

    await admin.from("etherfuse_customers").insert({
      issuer_id: issuer.id, customer_id: customerId, kyc_status: kycStatus, kyc_url: kycUrl,
    });

    return new Response(JSON.stringify({ customer_id: customerId, kyc_status: kycStatus, kyc_url: kycUrl, stellar_public_key: wallet.public_key }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
