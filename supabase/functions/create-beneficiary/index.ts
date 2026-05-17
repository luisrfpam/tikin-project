import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Check existing profile by cpf
    const { data: existingByCpf } = await admin.from("profiles").select("id,email").eq("cpf", cpf).maybeSingle();
    let beneficiaryId: string;
    let tempPassword: string | null = null;

    if (existingByCpf) {
      beneficiaryId = existingByCpf.id;
    } else {
      tempPassword = genTempPassword();
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, cpf, must_change_password: true },
      });
      if (cErr || !created.user) {
        return new Response(JSON.stringify({ error: cErr?.message || "Falha ao criar usuário" }), { status: 400, headers: corsHeaders });
      }
      beneficiaryId = created.user.id;
      await admin.from("profiles").update({ name, cpf }).eq("id", beneficiaryId);
      await admin.from("user_roles").insert([{ user_id: beneficiaryId, role: "beneficiario" }]);
    }

    // Link
    const { error: linkErr } = await admin.from("issuer_beneficiaries").upsert(
      { issuer_id: issuer.id, beneficiary_id: beneficiaryId, status: "active", activated_by: user.id },
      { onConflict: "issuer_id,beneficiary_id" }
    );
    if (linkErr) return new Response(JSON.stringify({ error: linkErr.message }), { status: 400, headers: corsHeaders });

    return new Response(JSON.stringify({
      beneficiary_id: beneficiaryId,
      temp_password: tempPassword,
      created: !existingByCpf,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
