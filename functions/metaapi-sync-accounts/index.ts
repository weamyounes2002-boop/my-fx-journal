import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // ✅ Handle CORS Preflight Request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("[metaapi-sync-accounts] ========== SYNC START ==========");
    console.log("[metaapi-sync-accounts] Request received at:", new Date().toISOString());

    // Get MetaAPI token from environment
    const metaApiToken = Deno.env.get("METAAPI_TOKEN");
    if (!metaApiToken) {
      console.error("[metaapi-sync-accounts] METAAPI_TOKEN not found in environment");
      return new Response(JSON.stringify({
        success: false,
        error: "MetaAPI token not configured",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get and validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[metaapi-sync-accounts] No Authorization header");
      return new Response(JSON.stringify({
        success: false,
        error: "Unauthorized: No token provided",
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract token by removing "Bearer " prefix
    const token = authHeader.replace('Bearer ', '');
    console.log("[metaapi-sync-accounts] Token extracted, length:", token.length);

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
    console.log("[metaapi-sync-accounts] Auth check - User:", user?.id);
    
    if (authError || !user) {
      console.error("[metaapi-sync-accounts] Authentication failed:", authError);
      return new Response(JSON.stringify({
        success: false,
        error: "Unauthorized: Invalid token",
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[metaapi-sync-accounts] ========== FETCHING METAAPI ACCOUNTS ==========");
    
    // Fetch all accounts from MetaAPI Cloud
    const listAccountsUrl = "https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts";
    
    const listResponse = await fetch(listAccountsUrl, {
      method: "GET",
      headers: {
        "auth-token": metaApiToken,
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error(
        "[metaapi-sync-accounts] Failed to fetch accounts:",
        listResponse.status,
        errorText
      );
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to fetch MetaAPI accounts: ${errorText}`,
      }), {
        status: listResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaApiAccounts = await listResponse.json();
    console.log("[metaapi-sync-accounts] Found", metaApiAccounts.length, "accounts in MetaAPI Cloud");

    // Get existing connections from database
    const { data: existingConnections, error: fetchError } = await supabase
      .from("mt_connections")
      .select("metaapi_account_id")
      .eq("user_id", user.id);

    if (fetchError) {
      console.error("[metaapi-sync-accounts] Failed to fetch existing connections:", fetchError);
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${fetchError.message}`,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingMetaApiIds = new Set(
      existingConnections?.map((conn) => conn.metaapi_account_id) || []
    );
    console.log("[metaapi-sync-accounts] Existing connections:", existingMetaApiIds.size);

    console.log("[metaapi-sync-accounts] ========== SYNCING ACCOUNTS ==========");
    
    const syncResults = {
      total: metaApiAccounts.length,
      synced: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const account of metaApiAccounts) {
      try {
        console.log("[metaapi-sync-accounts] Processing account:", account.id);
        
        // Skip if already exists
        if (existingMetaApiIds.has(account.id)) {
          console.log("[metaapi-sync-accounts] ⏭️ Skipping existing account:", account.id);
          syncResults.skipped++;
          continue;
        }

        // Extract broker name from account name
        const brokerName = account.name?.split(" Account ")[0] || "Unknown Broker";
        
        // Generate account_id
        const accountId = `${account.platform}_${account.login}_${account.server}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        const dbRecord = {
          user_id: user.id,
          account_id: accountId,
          login: account.login,
          server: account.server,
          broker: brokerName,
          metaapi_account_id: account.id,
          connection_status: account.connectionStatus === "CONNECTED" ? "connected" : "disconnected",
          connection_method: "metaapi",
          last_sync_time: new Date().toISOString(),
        };

        console.log("[metaapi-sync-accounts] Inserting record:", {
          ...dbRecord,
          metaapi_account_id: account.id,
        });

        const { error: insertError } = await supabase
          .from("mt_connections")
          .insert(dbRecord);

        if (insertError) {
          console.error("[metaapi-sync-accounts] ❌ Failed to insert account:", account.id, insertError);
          syncResults.errors.push(`${account.login}: ${insertError.message}`);
        } else {
          console.log("[metaapi-sync-accounts] ✅ Successfully synced account:", account.id);
          syncResults.synced++;
        }
      } catch (error) {
        console.error("[metaapi-sync-accounts] ❌ Error processing account:", account.id, error);
        syncResults.errors.push(`${account.login}: ${error.message}`);
      }
    }

    console.log("[metaapi-sync-accounts] ========== SYNC COMPLETE ==========");
    console.log("[metaapi-sync-accounts] Total accounts:", syncResults.total);
    console.log("[metaapi-sync-accounts] Synced:", syncResults.synced);
    console.log("[metaapi-sync-accounts] Skipped:", syncResults.skipped);
    console.log("[metaapi-sync-accounts] Errors:", syncResults.errors.length);

    return new Response(JSON.stringify({
      success: true,
      message: `Synced ${syncResults.synced} accounts from MetaAPI Cloud`,
      results: syncResults,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[metaapi-sync-accounts] ❌ UNHANDLED ERROR");
    console.error("[metaapi-sync-accounts] Error:", err);
    
    return new Response(JSON.stringify({
      success: false,
      error: "Sync failed",
      detail: err
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});