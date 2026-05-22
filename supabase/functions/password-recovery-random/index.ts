import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const authClient = createClient(url, anonKey);

    const { error: resetWithRedirectError } = await authClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || undefined,
    });

    if (resetWithRedirectError && redirectTo) {
      // Fallback for invalid redirect URL allow-list configuration.
      const { error: resetWithoutRedirectError } = await authClient.auth.resetPasswordForEmail(email);
      if (resetWithoutRedirectError) throw resetWithoutRedirectError;
      return done;
    }

    if (resetWithRedirectError) throw resetWithRedirectError;

    return done;
  } catch (e) {
    console.error("password-recovery-random error", e);
    return new Response(JSON.stringify({ error: "Falha ao processar recuperação de senha" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
