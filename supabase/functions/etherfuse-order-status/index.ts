import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ETHERFUSE_BASE = "https://api.sand.etherfuse.com";

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
    const orderId = body.order_id as string;
    const force = body.force as ("pay" | "expire" | undefined);
    if (!orderId) return new Response(JSON.stringify({ error: "order_id obrigatório" }), { status: 400, headers: corsHeaders });

    const { data: order } = await admin.from("onramp_orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return new Response(JSON.stringify({ error: "Order não encontrada" }), { status: 404, headers: corsHeaders });
    const { data: issuer } = await admin.from("issuers").select("id").eq("user_id", user.id).maybeSingle();
    if (!issuer || issuer.id !== order.issuer_id) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: corsHeaders });
    }

    if (order.status === "paid") {
      return new Response(JSON.stringify(order), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Allow explicit simulation only for sandbox/demo orders owned by the issuer.
    const isSandboxOrder = !!order.etherfuse_order_id?.startsWith("sandbox_");
    let newStatus = order.status;
    if (force) {
      if (!isSandboxOrder) {
        return new Response(JSON.stringify({ error: "Simulação permitida apenas em ordens sandbox" }), { status: 403, headers: corsHeaders });
      }
      if (order.status !== "pending") {
        return new Response(JSON.stringify({ error: "Apenas ordens pendentes podem ser simuladas" }), { status: 409, headers: corsHeaders });
      }
      newStatus = force === "pay" ? "paid" : "expired";
    } else {
      // Try real Etherfuse status
      try {
        if (order.etherfuse_order_id && !isSandboxOrder) {
          const r = await fetch(`${ETHERFUSE_BASE}/v1/ramps/onramp/${order.etherfuse_order_id}`, {
            headers: { "Authorization": `Bearer ${etherfuseKey}` },
          });
          if (r.ok) {
            const j = await r.json();
            const s = (j.status || "").toLowerCase();
            if (["paid", "completed", "settled"].includes(s)) newStatus = "paid";
            else if (["expired", "canceled", "failed"].includes(s)) newStatus = s === "failed" ? "failed" : "expired";
          }
        }
      } catch { /* ignore */ }
    }

    // Expire by time
    if (newStatus === "pending" && order.expires_at && new Date(order.expires_at).getTime() < Date.now()) {
      newStatus = "expired";
    }

    if (newStatus !== order.status) {
      const updates: any = { status: newStatus };

      if (newStatus === "paid") {
        // 1) Issue TESOURO asset from master -> issuer wallet on Stellar Testnet
        try {
          const issueRes = await fetch(`${url}/functions/v1/stellar-issue-tesouro`, {
            method: "POST",
            headers: { "Authorization": auth, "Content-Type": "application/json", apikey: anon },
            body: JSON.stringify({
              issuer_id: order.issuer_id,
              amount: Number(order.amount_brl),
              internal_id: order.id,
            }),
          });
          const issueJson = await issueRes.json().catch(() => ({}));
          if (issueJson?.hash) updates.stellar_tx_hash = issueJson.hash;
          // Record on blockchain log for visibility on the Blockchain page
          await admin.from("blockchain_transactions").insert({
            internal_id: order.id,
            entity_type: "issuer_funds",
            operation: "onramp_pix_settled",
            amount: Number(order.amount_brl),
            stellar_tx_hash: issueJson?.hash ?? null,
            status: issueJson?.success ? "success" : "failed",
            error: issueJson?.success ? null : (issueJson?.error || "Falha ao emitir TESOURO"),
            issuer_id: order.issuer_id,
          });
        } catch (e: any) {
          await admin.from("blockchain_transactions").insert({
            internal_id: order.id,
            entity_type: "issuer_funds",
            operation: "onramp_pix_settled",
            amount: Number(order.amount_brl),
            stellar_tx_hash: null,
            status: "failed",
            error: String(e?.message ?? e),
            issuer_id: order.issuer_id,
          });
        }

        // 2) Activate the linked fund and persist the on-chain hash
        if (order.issuer_funds_id) {
          const fundPatch: any = { status: "active" };
          if (updates.stellar_tx_hash) fundPatch.last_stellar_tx_hash = updates.stellar_tx_hash;
          await admin.from("issuer_funds").update(fundPatch).eq("id", order.issuer_funds_id);
        }
      } else if (newStatus === "failed" || newStatus === "expired") {
        if (order.issuer_funds_id) {
          await admin.from("issuer_funds").update({ status: "failed" }).eq("id", order.issuer_funds_id);
        }
      }

      const { data: updated } = await admin.from("onramp_orders").update(updates).eq("id", order.id).select().single();
      return new Response(JSON.stringify(updated), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(order), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
