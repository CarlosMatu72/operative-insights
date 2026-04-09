import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("GAFETE_ENCRYPTION_KEY");

    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "Encryption key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is authenticated and has admin or juridico role
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "juridico")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gafete_id } = await req.json();
    if (!gafete_id) {
      return new Response(JSON.stringify({ error: "gafete_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get encrypted password
    const { data: gafete, error: gafeteError } = await serviceClient
      .from("gafetes")
      .select("password_anam")
      .eq("id", gafete_id)
      .single();

    if (gafeteError || !gafete) {
      return new Response(JSON.stringify({ error: "Gafete not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let decryptedPassword = gafete.password_anam;

    // Try to decrypt if it looks encrypted (base64 pgp data)
    if (decryptedPassword) {
      try {
        // Use the DB function to decrypt with the key set via current_setting
        const { data: decrypted, error: decryptError } = await serviceClient.rpc(
          "decrypt_gafete_password",
          { encrypted_text: decryptedPassword }
        );
        // If the DB function can't access the key, it will fail
        // In that case we return the raw value (might be plaintext from before migration)
        if (!decryptError && decrypted) {
          decryptedPassword = decrypted;
        }
      } catch {
        // If decryption fails, it might be a pre-migration plaintext value
      }
    }

    return new Response(JSON.stringify({ password: decryptedPassword }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
