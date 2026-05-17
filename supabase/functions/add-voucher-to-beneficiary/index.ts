import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const cpf = (body.cpf || "").replace(/\D/g, "");
    const value = Number(body.value);
    const expiration_date = body.expiration_date;
    const category = (body.category || "outros").toString();
    if (cpf.length !== 11 || !(value > 0) || !expiration_date) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), { status: 400, headers: corsHeaders });
    }

    // Validate category against voucher_categories table
    const { data: catRow } = await admin.from("voucher_categories").select("id").eq("id", category).eq("active", true).maybeSingle();
    if (!catRow) {
      return new Response(JSON.stringify({ error: `Categoria inválida: ${category}` }), { status: 400, headers: corsHeaders });
    }

    const { data: issuer } = await admin.from("issuers").select("id").eq("user_id", user.id).maybeSingle();
    if (!issuer) return new Response(JSON.stringify({ error: "Emissor não encontrado" }), { status: 403, headers: corsHeaders });

    const { data: benefProfile } = await admin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
    if (!benefProfile) {
      return new Response(JSON.stringify({ error: "Beneficiário não cadastrado. Cadastre antes." }), { status: 404, headers: corsHeaders });
    }

    // Ensure link exists & active
    const { data: link } = await admin.from("issuer_beneficiaries")
      .select("status").eq("issuer_id", issuer.id).eq("beneficiary_id", benefProfile.id).maybeSingle();
    if (!link) {
      await admin.from("issuer_beneficiaries").insert({
        issuer_id: issuer.id, beneficiary_id: benefProfile.id, status: "active", activated_by: user.id,
      });
    } else if (link.status !== "active") {
      return new Response(JSON.stringify({ error: "Beneficiário inativo para este emissor" }), { status: 400, headers: corsHeaders });
    }

    // Consume monthly funds
    const { error: fErr } = await admin.rpc("consume_issuer_funds", { _issuer_id: issuer.id, _value: value, _category: category });
    if (fErr) return new Response(JSON.stringify({ error: fErr.message }), { status: 400, headers: corsHeaders });

    // Insert voucher
    const { data: voucher, error: vErr } = await admin.from("vouchers").insert([{
      issuer_id: issuer.id,
      beneficiary_id: benefProfile.id,
      beneficiary_cpf: cpf,
      value,
      remaining_value: value,
      expiration_date,
      rules: { category },
      status: "active",
    }]).select().single();
    if (vErr) return new Response(JSON.stringify({ error: vErr.message }), { status: 400, headers: corsHeaders });

    return new Response(JSON.stringify({ voucher }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
