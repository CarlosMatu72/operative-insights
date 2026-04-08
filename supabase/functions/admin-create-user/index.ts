import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Solo administradores pueden ejecutar esta acción" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // Helper to log audit
    const logAudit = async (actionName: string, tableName: string, recordId: string, details: any) => {
      await adminClient.from("audit_logs").insert({
        action: actionName,
        table_name: tableName,
        record_id: recordId,
        user_id: caller.id,
        details,
      });
    };

    // ── CREATE USER ──
    if (action === "create_user" || !action) {
      const { nombre, correo, password, role } = body;
      if (!nombre || !correo || !password || !role) {
        return new Response(
          JSON.stringify({ error: "Todos los campos son requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!["admin", "glosa", "juridico"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "Rol inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: correo,
          password,
          email_confirm: true,
          user_metadata: { nombre },
        });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });

      await logAudit("CREATE_USER", "profiles", newUser.user.id, { nombre, correo, role });

      return new Response(
        JSON.stringify({ success: true, user_id: newUser.user.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RESET PASSWORD ──
    if (action === "reset_password") {
      const { user_id, new_password } = body;
      if (!user_id || !new_password) {
        return new Response(
          JSON.stringify({ error: "user_id y new_password son requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await adminClient.auth.admin.updateUser(user_id, {
        password: new_password,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await logAudit("RESET_PASSWORD", "auth.users", user_id, {});

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CHANGE ROLE ──
    if (action === "change_role") {
      const { user_id, new_role } = body;
      if (!user_id || !new_role || !["admin", "glosa", "juridico"].includes(new_role)) {
        return new Response(
          JSON.stringify({ error: "user_id y new_role válido son requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete existing role and insert new one
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await adminClient
        .from("user_roles")
        .insert({ user_id, role: new_role });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await logAudit("CHANGE_ROLE", "user_roles", user_id, { new_role });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── TOGGLE ACTIVE ──
    if (action === "toggle_active") {
      const { user_id, activo } = body;
      if (!user_id || activo === undefined) {
        return new Response(
          JSON.stringify({ error: "user_id y activo son requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await adminClient
        .from("profiles")
        .update({ activo })
        .eq("id", user_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also ban/unban the auth user to prevent login
      await adminClient.auth.admin.updateUser(user_id, {
        ban_duration: activo ? "none" : "876000h", // ~100 years
      });

      await logAudit("TOGGLE_ACTIVE", "profiles", user_id, { activo });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no válida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
