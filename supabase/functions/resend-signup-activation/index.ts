import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resendSignupEmail(authClient: ReturnType<typeof createClient>, email: string, redirectTo?: string) {
  const withRedirect = await authClient.auth.resend({
    type: "signup",
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });

  if (!withRedirect.error) return;

  // Fallback without redirect for projects that still do not allow-list the URL.
  if (redirectTo) {
    const withoutRedirect = await authClient.auth.resend({
      type: "signup",
      email,
    });
    if (!withoutRedirect.error) return;
    throw withoutRedirect.error;
  }

  throw withRedirect.error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const redirectTo = String(body?.redirectTo ?? "").trim();

    if (!isValidEmail(email)) {
      return jsonResponse(400, { error: "E-mail invalido" });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, serviceRoleKey);

    await resendSignupEmail(authClient, email, redirectTo || undefined);

    return jsonResponse(200, { ok: true });
  } catch (error) {
    console.error("resend-signup-activation error", error);
    // Generic error to avoid account enumeration details.
    return jsonResponse(500, { error: "Falha ao reenviar e-mail de ativacao" });
  }
});
