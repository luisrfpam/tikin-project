import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-service-key",
};

type RetryBody = {
  max_orders?: number;
  lookback_hours?: number;
  issuer_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization");
    const internalServiceKey = req.headers.get("x-internal-service-key");
    const isInternalCall = !!internalServiceKey && internalServiceKey === service;

    if (!auth && !isInternalCall) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service);

    const body = (await req.json().catch(() => ({}))) as RetryBody;
    const maxOrders = Math.min(Math.max(Number(body.max_orders ?? 10), 1), 50);
    const lookbackHours = Math.min(Math.max(Number(body.lookback_hours ?? 48), 1), 24 * 14);

    let issuerIds: string[] | null = null;
    if (!isInternalCall) {
      const userClient = createClient(url, anon, { global: { headers: { Authorization: auth! } } });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: issuerRows, error: issuerErr } = await admin
        .from("issuers")
        .select("id")
        .eq("user_id", userData.user.id);

      if (issuerErr) {
        return new Response(JSON.stringify({ error: issuerErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      issuerIds = (issuerRows || []).map((x) => x.id);
      if (issuerIds.length === 0) {
        return new Response(JSON.stringify({ retried: 0, succeeded: 0, failed: 0, skipped: 0, details: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let query = admin
      .from("offramp_orders")
      .select("id, transaction_id, status, issuer_id, created_at")
      .eq("status", "failed")
      .gte("created_at", new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString())
      .order("created_at", { ascending: true })
      .limit(maxOrders);

    if (issuerIds) {
      query = query.in("issuer_id", issuerIds);
    } else if (body.issuer_id) {
      query = query.eq("issuer_id", body.issuer_id);
    }

    const { data: failedOrders, error: failedErr } = await query;
    if (failedErr) {
      return new Response(JSON.stringify({ error: failedErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ order_id: string; transaction_id: string; outcome: "success" | "failed" | "skipped"; detail?: string }> = [];

    for (const order of failedOrders || []) {
      if (!order.transaction_id) {
        results.push({ order_id: order.id, transaction_id: "", outcome: "skipped", detail: "missing transaction_id" });
        continue;
      }

      try {
        const res = await fetch(`${url}/functions/v1/etherfuse-create-offramp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anon,
            "x-internal-service-key": service,
          },
          body: JSON.stringify({ transaction_id: order.transaction_id }),
        });

        const json = await res.json().catch(() => ({}));
        const success = res.ok && json?.status !== "failed" && !json?.error;
        results.push({
          order_id: order.id,
          transaction_id: order.transaction_id,
          outcome: success ? "success" : "failed",
          detail: success ? undefined : (json?.error || `HTTP ${res.status}`),
        });
      } catch (e) {
        results.push({
          order_id: order.id,
          transaction_id: order.transaction_id,
          outcome: "failed",
          detail: String((e as Error)?.message ?? e),
        });
      }
    }

    const retried = results.length;
    const succeeded = results.filter((r) => r.outcome === "success").length;
    const failed = results.filter((r) => r.outcome === "failed").length;
    const skipped = results.filter((r) => r.outcome === "skipped").length;

    return new Response(JSON.stringify({ retried, succeeded, failed, skipped, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
