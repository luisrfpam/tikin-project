// Ensures the authenticated emissor has a Stellar wallet (creates + funds via Friendbot if missing).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Stellar StrKey (no SDK) ---
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(data: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of data) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += "=";
  return out;
}
function crc16xmodem(data: Uint8Array): Uint8Array {
  let crc = 0; for (const b of data) { crc ^= b << 8; for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff; }
  return new Uint8Array([crc & 0xff, (crc >> 8) & 0xff]);
}
function encodeStrKey(versionByte: number, payload: Uint8Array): string {
  const data = new Uint8Array(1 + payload.length); data[0] = versionByte; data.set(payload, 1);
  const cs = crc16xmodem(data); const full = new Uint8Array(data.length + 2); full.set(data); full.set(cs, data.length);
  return base32Encode(full).replace(/=+$/, "");
}
async function generateKeypair(): Promise<{ publicKey: string; secret: string }> {
  const kp = await crypto.subtle.generateKey({ name: "Ed25519" } as any, true, ["sign", "verify"]) as CryptoKeyPair;
  const priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pub = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const b64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  return { publicKey: encodeStrKey(6 << 3, b64u(pub.x!)), secret: encodeStrKey(18 << 3, b64u(priv.d!)) };
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
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const masterSecret = Deno.env.get("STELLAR_SECRET_KEY")!;

    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    let issuerId: string | null = null;
    try { const b = await req.json(); if (b?.issuer_id) issuerId = b.issuer_id; } catch {}

    let issuerQuery = admin.from("issuers").select("id, user_id");
    issuerQuery = issuerId ? issuerQuery.eq("id", issuerId) : issuerQuery.eq("user_id", user.id);
    const { data: issuer } = await issuerQuery.maybeSingle();
    if (!issuer) return new Response(JSON.stringify({ error: "Emissor não encontrado" }), { status: 404, headers: corsHeaders });
    if (issuer.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const { data: existing } = await admin
      .from("issuer_stellar_wallets")
      .select("public_key")
      .eq("issuer_id", issuer.id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ public_key: existing.public_key, created: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const kp = await generateKeypair();
    const enc = await encryptSecret(kp.secret, masterSecret);
    const { error: insErr } = await admin.from("issuer_stellar_wallets").insert({
      issuer_id: issuer.id, public_key: kp.publicKey, secret_encrypted: enc,
    });
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });

    // Best-effort fund via friendbot (testnet) so account exists for trustlines/payments
    try {
      await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(kp.publicKey)}`);
    } catch (e) {
      console.error("friendbot fund failed (continuing)", e);
    }

    return new Response(JSON.stringify({ public_key: kp.publicKey, created: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stellar-ensure-wallet error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders });
  }
});
