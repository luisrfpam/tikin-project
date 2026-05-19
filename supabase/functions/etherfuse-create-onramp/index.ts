import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ETHERFUSE_BASE = "https://api.sand.etherfuse.com";

// Generates a demo PIX "copia e cola" payload (BR Code-like format) for sandbox use
function buildPixPayload(amount: number, orderId: string): string {
  const v = amount.toFixed(2);
  // Simplified BR Code (not validated CRC) for demo display
  return `00020126580014BR.GOV.BCB.PIX0136tikin-${orderId}5204000053039865406${v}5802BR5910TIKIN ONRAMP6009SAO PAULO62070503${orderId.slice(0,5)}6304ABCD`;
}

function buildPixQrUrl(payload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload)}`;
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

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const amount = Number(body.amount_brl);
    const fundsId = body.issuer_funds_id as string | undefined;
    if (!(amount > 0)) return new Response(JSON.stringify({ error: "amount_brl inválido" }), { status: 400, headers: corsHeaders });

    const { data: issuer } = await admin.from("issuers").select("id").eq("user_id", user.id).maybeSingle();
    if (!issuer) return new Response(JSON.stringify({ error: "Emissor não encontrado" }), { status: 404, headers: corsHeaders });

    const { data: cust } = await admin.from("etherfuse_customers").select("*").eq("issuer_id", issuer.id).maybeSingle();
    if (!cust) return new Response(JSON.stringify({ error: "Customer Etherfuse não criado" }), { status: 400, headers: corsHeaders });
    if (cust.kyc_status !== "approved") {
      return new Response(JSON.stringify({ error: "KYC ainda não aprovado", kyc_url: cust.kyc_url, kyc_status: cust.kyc_status }), { status: 400, headers: corsHeaders });
    }

    const { data: wallet } = await admin.from("issuer_stellar_wallets").select("public_key").eq("issuer_id", issuer.id).maybeSingle();

    // Reuse existing unexpired pending order for the same fund (avoid creating
    // a new pending order every time the modal mounts, which used to reset the
    // fund status back to pending_funding even after a previous successful PIX).
    if (fundsId) {
      const { data: existingOrder } = await admin
        .from("onramp_orders")
        .select("*")
        .eq("issuer_funds_id", fundsId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingOrder && Number(existingOrder.amount_brl) === amount) {
        return new Response(JSON.stringify(existingOrder), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Create draft order row
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: order, error: oErr } = await admin.from("onramp_orders").insert({
      issuer_id: issuer.id,
      issuer_funds_id: fundsId || null,
      amount_brl: amount,
      expires_at: expires,
      status: "pending",
    }).select().single();
    if (oErr) return new Response(JSON.stringify({ error: oErr.message }), { status: 500, headers: corsHeaders });

    let etherfuseOrderId = ""; let pixCode = ""; let pixQr = "";

    try {
      const efRes = await fetch(`${ETHERFUSE_BASE}/v1/ramps/onramp`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${etherfuseKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: cust.customer_id,
          source_amount: amount,
          source_currency: "BRL",
          target_asset: "TESOURO",
          target_network: "stellar",
          destination_address: wallet?.public_key,
          payment_method: "pix",
        }),
      });
      const efJson = await efRes.json().catch(() => ({}));
      if (efRes.ok) {
        etherfuseOrderId = efJson.id || efJson.order_id || `ord_${order.id.slice(0, 8)}`;
        pixCode = efJson.pix_copy_paste || efJson.pix_emv || buildPixPayload(amount, order.id);
        pixQr = efJson.pix_qr_code_url || buildPixQrUrl(pixCode);
      } else {
        etherfuseOrderId = `sandbox_ord_${order.id.slice(0, 8)}`;
        pixCode = buildPixPayload(amount, order.id);
        pixQr = buildPixQrUrl(pixCode);
      }
    } catch {
      etherfuseOrderId = `sandbox_ord_${order.id.slice(0, 8)}`;
      pixCode = buildPixPayload(amount, order.id);
      pixQr = buildPixQrUrl(pixCode);
    }

    const { data: updated, error: uErr } = await admin.from("onramp_orders").update({
      etherfuse_order_id: etherfuseOrderId,
      pix_qr: pixQr,
      pix_copy_paste: pixCode,
    }).eq("id", order.id).select().single();
    if (uErr) return new Response(JSON.stringify({ error: uErr.message }), { status: 500, headers: corsHeaders });

    // Link order to fund. Only mark pending_funding if the fund is not already
    // active (don't undo a previously paid PIX).
    if (fundsId) {
      const { data: fund } = await admin.from("issuer_funds").select("status").eq("id", fundsId).maybeSingle();
      const patch: any = { onramp_order_id: order.id };
      if (fund?.status !== "active") patch.status = "pending_funding";
      await admin.from("issuer_funds").update(patch).eq("id", fundsId);
    }

    return new Response(JSON.stringify(updated), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
