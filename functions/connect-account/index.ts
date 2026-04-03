import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ConnectAccountRequest {
  server: string;
  login: string;
  password: string;
  platform: 'mt4' | 'mt5';
  account_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log("[connect-account] ========== REQUEST START ==========");
    console.log("[connect-account] Request received at:", new Date().toISOString());

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[connect-account] No Authorization header");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: No token provided",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log("[connect-account] Token extracted, length:", token.length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log("[connect-account] User ID:", user?.id);
    
    if (authError || !user) {
      console.error("[connect-account] Authentication failed:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: Invalid token",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: ConnectAccountRequest = await req.json();
    console.log("[connect-account] ========== REQUEST BODY ==========");
    console.log("[connect-account] Server:", body.server);
    console.log("[connect-account] Login:", body.login);
    console.log("[connect-account] Platform:", body.platform);
    console.log("[connect-account] Account ID:", body.account_id);

    const { server, login, password, platform, account_id } = body;

    if (!server || !login || !password || !platform || !account_id) {
      console.error("[connect-account] Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: server, login, password, platform, and account_id are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[connect-account] ========== STORING CREDENTIALS ==========");
    
    // Simple encryption for password (base64 encoding)
    const encryptedPassword = btoa(password);
    
    const dbRecord = {
      user_id: user.id,
      account_id: account_id,
      login: login,
      server: server,
      broker: server.split('-')[0] || 'Unknown',
      platform: platform,
      investor_password_encrypted: encryptedPassword,
      connection_status: "pending_metaapi",
      connection_method: "manual",
      last_sync_time: new Date().toISOString(),
    };
    
    console.log("[connect-account] Database record to insert:", {
      ...dbRecord,
      investor_password_encrypted: "***REDACTED***"
    });

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from("mt_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("login", login)
      .eq("server", server)
      .single();

    if (existingConnection) {
      console.log("[connect-account] Connection already exists, updating...");
      
      const { error: updateError } = await supabase
        .from("mt_connections")
        .update(dbRecord)
        .eq("id", existingConnection.id);

      if (updateError) {
        console.error("[connect-account] ❌ DATABASE UPDATE FAILED");
        console.error("[connect-account] Error:", updateError);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Database error: ${updateError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      const { error: dbError } = await supabase
        .from("mt_connections")
        .insert(dbRecord);

      if (dbError) {
        console.error("[connect-account] ❌ DATABASE INSERT FAILED");
        console.error("[connect-account] Error:", dbError);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Database error: ${dbError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("[connect-account] ✅ DATABASE INSERT SUCCESSFUL");
    }

    console.log("[connect-account] ========== REQUEST COMPLETE ==========");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Credentials saved. Please follow the instructions to create your MetaAPI account.",
        instructions: {
          step1: "Go to https://app.metaapi.cloud/",
          step2: "Sign up or log in to MetaAPI",
          step3: "Click 'Add Account' and enter your broker credentials",
          step4: "Copy the MetaAPI Account ID (starts with a letter, e.g., 'a1b2c3d4')",
          step5: "Return to MyFXJournal and enter this ID to complete the connection"
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[connect-account] ❌ UNHANDLED ERROR");
    console.error("[connect-account] Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});