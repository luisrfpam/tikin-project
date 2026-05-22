import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const eligibleRoles = ["beneficiario", "lojista", "emissor"] as const;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const done = new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const redirectTo = String(body?.redirectTo ?? "").trim();
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);
    const authClient = createClient(url, anonKey);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, name")
      .ilike("email", email)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return done;

    const { data: roles, error: rolesError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .in("role", [...eligibleRoles])
      .limit(1);

    if (rolesError) throw rolesError;
    if (!roles || roles.length === 0) return done;

    const { error: resetError } = await authClient.auth.resetPasswordForEmail(profile.email, {
      redirectTo: redirectTo || undefined,
    });
    if (resetError) throw resetError;

    return done;
  } catch (e) {
    console.error("password-recovery-random error", e);
    return new Response(JSON.stringify({ error: "Falha ao processar recuperação de senha" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
