import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BlockchainRow = {
  id: string;
  internal_id: string;
  entity_type: string;
  operation: string;
  amount: number | null;
  stellar_tx_hash: string | null;
  stellar_ledger: number | null;
  status: string;
  error: string | null;
  created_at: string;
};

type OnrampRow = {
  id: string;
  amount_brl: number;
  status: string;
  stellar_tx_hash: string | null;
  created_at: string;
  expires_at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service);

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: issuer } = await admin.from("issuers").select("id").eq("user_id", user.id).maybeSingle();
    if (!issuer) {
      return new Response(JSON.stringify({ rows: [], onramps: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [issuerTxRes, actorTxRes, onrampsRes] = await Promise.all([
      admin
        .from("blockchain_transactions")
        .select("id, internal_id, entity_type, operation, amount, stellar_tx_hash, stellar_ledger, status, error, created_at")
        .eq("issuer_id", issuer.id)
        .order("created_at", { ascending: false })
        .limit(500),
      admin
        .from("blockchain_transactions")
        .select("id, internal_id, entity_type, operation, amount, stellar_tx_hash, stellar_ledger, status, error, created_at")
        .is("issuer_id", null)
        .eq("actor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500),
      admin
        .from("onramp_orders")
        .select("id, amount_brl, status, stellar_tx_hash, created_at, expires_at")
        .eq("issuer_id", issuer.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (issuerTxRes.error || actorTxRes.error || onrampsRes.error) {
      return new Response(
        JSON.stringify({
          error: issuerTxRes.error?.message || actorTxRes.error?.message || onrampsRes.error?.message || "Falha ao carregar histórico",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const merged = new Map<string, BlockchainRow>();
    for (const row of (issuerTxRes.data || [])) merged.set(row.id, row as BlockchainRow);
    for (const row of (actorTxRes.data || [])) merged.set(row.id, row as BlockchainRow);

    const rows = Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return new Response(JSON.stringify({ rows, onramps: (onrampsRes.data || []) as OnrampRow[] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
