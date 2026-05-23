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
  business_status?: string | null;
  counterparty_label?: string | null;
  cycle_transaction_id?: string | null;
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

    const txIds = Array.from(
      new Set(
        rows
          .filter((r) => r.entity_type === "transaction" && !!r.internal_id)
          .map((r) => r.internal_id),
      ),
    );
    const chargeIds = Array.from(
      new Set(
        rows
          .filter((r) => r.entity_type === "charge" && !!r.internal_id)
          .map((r) => r.internal_id),
      ),
    );
    const offrampIds = Array.from(
      new Set(
        rows
          .filter((r) => r.entity_type === "offramp_order" && !!r.internal_id)
          .map((r) => r.internal_id),
      ),
    );

    const [txRes, chargeRes, offrampRes] = await Promise.all([
      txIds.length
        ? admin
            .from("transactions")
            .select("id, status, beneficiary_name, establishment_id")
            .in("id", txIds)
        : Promise.resolve({ data: [], error: null } as any),
      chargeIds.length
        ? admin
            .from("charges")
            .select("id, status, transaction_id, establishment_id")
            .in("id", chargeIds)
        : Promise.resolve({ data: [], error: null } as any),
      offrampIds.length
        ? admin
            .from("offramp_orders")
            .select("id, status, transaction_id, establishment_id")
            .in("id", offrampIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const txById = new Map<string, any>();
    for (const row of txRes.data || []) txById.set(row.id, row);

    const chargeById = new Map<string, any>();
    for (const row of chargeRes.data || []) chargeById.set(row.id, row);

    const offrampById = new Map<string, any>();
    for (const row of offrampRes.data || []) offrampById.set(row.id, row);

    const establishmentIds = Array.from(
      new Set(
        [
          ...(txRes.data || []).map((x: any) => x.establishment_id),
          ...(chargeRes.data || []).map((x: any) => x.establishment_id),
          ...(offrampRes.data || []).map((x: any) => x.establishment_id),
        ].filter(Boolean),
      ),
    );

    const estById = new Map<string, string>();
    if (establishmentIds.length) {
      const { data: estRows } = await admin
        .from("establishments")
        .select("id, name")
        .in("id", establishmentIds);
      for (const e of estRows || []) estById.set(e.id, e.name);
    }

    const enrichedRows = rows.map((row) => {
      let businessStatus: string | null = null;
      let counterpartyLabel: string | null = null;
      let cycleTransactionId: string | null = null;

      if (row.entity_type === "transaction") {
        const tx = txById.get(row.internal_id);
        if (tx) {
          businessStatus = tx.status;
          cycleTransactionId = tx.id;
          const merchant = tx.establishment_id ? estById.get(tx.establishment_id) : null;
          if (tx.beneficiary_name || merchant) {
            counterpartyLabel = `${tx.beneficiary_name || "Beneficiário"} -> ${merchant || "Lojista"}`;
          }
        }
      } else if (row.entity_type === "charge") {
        const charge = chargeById.get(row.internal_id);
        if (charge) {
          businessStatus = charge.status;
          cycleTransactionId = charge.transaction_id || null;
          const merchant = charge.establishment_id ? estById.get(charge.establishment_id) : null;
          if (merchant) counterpartyLabel = merchant;
        }
      } else if (row.entity_type === "offramp_order") {
        const order = offrampById.get(row.internal_id);
        if (order) {
          cycleTransactionId = order.transaction_id || null;
          const tx = order.transaction_id ? txById.get(order.transaction_id) : null;
          // If the source payment was reversed, expose this in issuer history so reconciliations are clear.
          businessStatus = tx?.status === "reversed" ? "reversed" : (order.status || null);
          const merchant = order.establishment_id ? estById.get(order.establishment_id) : null;
          if (tx?.beneficiary_name || merchant) {
            counterpartyLabel = `${tx?.beneficiary_name || "Beneficiário"} -> ${merchant || "Lojista"}`;
          }
        }
      }

      return {
        ...row,
        business_status: businessStatus,
        counterparty_label: counterpartyLabel,
        cycle_transaction_id: cycleTransactionId,
      };
    });

    return new Response(JSON.stringify({ rows: enrichedRows, onramps: (onrampsRes.data || []) as OnrampRow[] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
