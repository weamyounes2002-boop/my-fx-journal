import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const METAAPI_PROVISIONING_BASE_URL =
  Deno.env.get("METAAPI_PROVISIONING_BASE_URL") || "https://mt-provisioning-api-v1.agiliumtrade.ai";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[metaapi-list-accounts] ========== REQUEST START ==========");
    console.log("[metaapi-list-accounts] Request received at:", new Date().toISOString());

    // Get MetaAPI token from environment
    const metaApiToken = Deno.env.get("METAAPI_TOKEN");
    if (!metaApiToken) {
      console.error("[metaapi-list-accounts] METAAPI_TOKEN not found in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "MetaAPI token not configured",
          statusCode: 500,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get and validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[metaapi-list-accounts] No Authorization header");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: No token provided",
          statusCode: 401,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract token by removing "Bearer " prefix
    const token = authHeader.replace('Bearer ', '');
    console.log("[metaapi-list-accounts] Token extracted, length:", token.length);

    // Initialize Supabase client with the user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log("[metaapi-list-accounts] User ID:", user?.id);
    
    if (authError || !user) {
      console.error("[metaapi-list-accounts] Authentication failed:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: Invalid token",
          details: authError?.message,
          statusCode: 401,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[metaapi-list-accounts] ========== FETCHING ACCOUNTS FROM METAAPI ==========");
    
    // Fetch existing accounts from MetaAPI
    const listAccountsUrl = `${METAAPI_PROVISIONING_BASE_URL}/users/current/accounts`;
    
    const response = await fetch(listAccountsUrl, {
      method: "GET",
      headers: {
        "auth-token": metaApiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[metaapi-list-accounts] Failed to fetch accounts:",
        response.status,
        errorText
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch MetaAPI accounts: ${errorText}`,
          statusCode: response.status,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accounts = await response.json();
    console.log("[metaapi-list-accounts] ✅ Successfully fetched accounts");
    console.log("[metaapi-list-accounts] Total accounts:", accounts.length);

    // Get already connected accounts from database
    const { data: connectedAccounts, error: dbError } = await supabase
      .from("mt_connections")
      .select("metaapi_account_id")
      .eq("user_id", user.id);

    if (dbError) {
      console.error("[metaapi-list-accounts] Database error:", dbError);
    }

    const connectedAccountIds = new Set(
      (connectedAccounts || []).map(acc => acc.metaapi_account_id)
    );

    // Filter and format accounts
    const formattedAccounts = accounts.map((account: any) => ({
      id: account.id,
      name: account.name,
      login: account.login,
      server: account.server,
      platform: account.platform,
      broker: account.broker || account.server,
      state: account.state,
      connectionStatus: account.connectionStatus,
      isConnected: connectedAccountIds.has(account.id),
    }));

    console.log("[metaapi-list-accounts] ========== REQUEST COMPLETE ==========");
    
    return new Response(
      JSON.stringify({
        success: true,
        accounts: formattedAccounts,
        total: formattedAccounts.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[metaapi-list-accounts] ❌ UNHANDLED ERROR");
    console.error("[metaapi-list-accounts] Error type:", error.constructor.name);
    console.error("[metaapi-list-accounts] Error message:", error.message);
    console.error("[metaapi-list-accounts] Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        error_type: error.constructor.name,
        statusCode: 500,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
