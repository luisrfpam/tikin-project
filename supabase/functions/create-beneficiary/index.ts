import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACCOUNT_CREATION_NOT_ALLOWED = "Não é possível criar uma conta";

function genTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "!1";
}

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

    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const name = (body.name || "").trim();
    const cpf = (body.cpf || "").replace(/\D/g, "");
    const email = (body.email || "").trim().toLowerCase();
    if (!name || cpf.length !== 11 || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), { status: 400, headers: corsHeaders });
    }

    const { data: issuer } = await admin.from("issuers").select("id").eq("user_id", user.id).maybeSingle();
    if (!issuer) return new Response(JSON.stringify({ error: "Emissor não encontrado" }), { status: 403, headers: corsHeaders });

    const { data: conflictByCpfOrCnpj } = await admin.rpc("lookup_email_by_identifier", { _identifier: cpf });
    const { data: conflictByEmail } = await admin.rpc("lookup_email_by_identifier", { _identifier: email });
    if (conflictByCpfOrCnpj || conflictByEmail) {
      return new Response(JSON.stringify({ error: ACCOUNT_CREATION_NOT_ALLOWED }), { status: 409, headers: corsHeaders });
    }

    const tempPassword = genTempPassword();
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, cpf, must_change_password: true },
    });
    if (cErr || !created.user) {
      const msg = (cErr?.message || "").toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("duplicate key") ||
        msg.includes("unique constraint") ||
        msg.includes("database error saving new user")
      ) {
        return new Response(JSON.stringify({ error: ACCOUNT_CREATION_NOT_ALLOWED }), { status: 409, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: cErr?.message || "Falha ao criar usuário" }), { status: 400, headers: corsHeaders });
    }

    const beneficiaryId = created.user.id;
    const { error: profileErr } = await admin.from("profiles").update({ name, cpf }).eq("id", beneficiaryId);
    if (profileErr) {
      const msg = (profileErr.message || "").toLowerCase();
      if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
        return new Response(JSON.stringify({ error: ACCOUNT_CREATION_NOT_ALLOWED }), { status: 409, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: profileErr.message }), { status: 400, headers: corsHeaders });
    }

    const { error: roleErr } = await admin.from("user_roles").insert([{ user_id: beneficiaryId, role: "beneficiario" }]);
    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), { status: 400, headers: corsHeaders });
    }

    // Link
    const { data: linkRow, error: linkErr } = await admin.from("issuer_beneficiaries").upsert(
      { issuer_id: issuer.id, beneficiary_id: beneficiaryId, status: "active", activated_by: user.id },
      { onConflict: "issuer_id,beneficiary_id" }
    ).select("id").single();
    if (linkErr) return new Response(JSON.stringify({ error: linkErr.message }), { status: 400, headers: corsHeaders });

    return new Response(JSON.stringify({
      beneficiary_id: beneficiaryId,
      issuer_beneficiary_id: linkRow?.id ?? null,
      temp_password: tempPassword,
      created: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
