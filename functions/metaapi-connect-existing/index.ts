import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConnectExistingRequest {
  metaapi_account_id: string;
  platform: 'mt4' | 'mt5';
  account_id: string;
}

// Helper function to trigger historical data sync
async function triggerHistoricalDataSync(
  metaApiAccountId: string,
  supabaseUrl: string,
  authToken: string
): Promise<void> {
  console.log("[metaapi-connect-existing] ========== TRIGGERING AUTO-SYNC ==========");
  console.log("[metaapi-connect-existing] Starting automatic historical data sync for account:", metaApiAccountId);
  
  try {
    // Call the metaapi-fetch-history function to sync 1 year of data
    const syncUrl = `${supabaseUrl}/functions/v1/metaapi-fetch-history`;
    
    const syncResponse = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        metaapi_account_id: metaApiAccountId,
        start_time: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
      }),
    });

    if (syncResponse.ok) {
      const syncResult = await syncResponse.json();
      console.log("[metaapi-connect-existing] ✅ Auto-sync completed successfully:", syncResult);
    } else {
      const errorText = await syncResponse.text();
      console.error("[metaapi-connect-existing] ⚠️ Auto-sync failed:", syncResponse.status, errorText);
    }
  } catch (error) {
    console.error("[metaapi-connect-existing] ⚠️ Auto-sync error:", error);
    // Don't fail the connection if sync fails
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[metaapi-connect-existing] ========== REQUEST START ==========");
    console.log("[metaapi-connect-existing] Request received at:", new Date().toISOString());

    // Get and validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[metaapi-connect-existing] No Authorization header");
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
    console.log("[metaapi-connect-existing] Token extracted, length:", token.length);

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
    console.log("[metaapi-connect-existing] User ID:", user?.id);
    
    if (authError || !user) {
      console.error("[metaapi-connect-existing] Authentication failed:", authError);
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

    // Parse request body
    const body: ConnectExistingRequest = await req.json();
    console.log("[metaapi-connect-existing] ========== REQUEST BODY ==========");
    console.log("[metaapi-connect-existing] MetaAPI Account ID:", body.metaapi_account_id);
    console.log("[metaapi-connect-existing] Platform:", body.platform);
    console.log("[metaapi-connect-existing] Account ID:", body.account_id);

    const {
      metaapi_account_id,
      platform,
      account_id,
    } = body;

    // Validate required fields
    if (!metaapi_account_id || !platform || !account_id) {
      console.error("[metaapi-connect-existing] Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: metaapi_account_id, platform, and account_id are required",
          statusCode: 400,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[metaapi-connect-existing] ========== DATABASE INSERTION ==========");
    
    const dbRecord = {
      user_id: user.id,
      account_id: account_id,
      login: "N/A", // We don't have this info without fetching from MetaAPI
      server: "N/A", // We don't have this info without fetching from MetaAPI
      broker: platform === 'mt4' ? 'MetaTrader 4' : 'MetaTrader 5',
      metaapi_account_id: metaapi_account_id,
      connection_status: "connected",
      connection_method: "metaapi",
      last_sync_time: new Date().toISOString(),
    };
    
    console.log("[metaapi-connect-existing] Database record to insert:", dbRecord);

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from("mt_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("metaapi_account_id", metaapi_account_id)
      .single();

    if (existingConnection) {
      console.log("[metaapi-connect-existing] ⚠️ Connection already exists");
      return new Response(
        JSON.stringify({
          success: false,
          error: "This account is already connected",
          statusCode: 409,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert connection record
    const { data: insertData, error: dbError } = await supabase
      .from("mt_connections")
      .insert(dbRecord)
      .select();

    if (dbError) {
      console.error("[metaapi-connect-existing] ❌ DATABASE INSERT FAILED");
      console.error("[metaapi-connect-existing] Error:", dbError);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${dbError.message}`,
          statusCode: 500,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[metaapi-connect-existing] ✅ DATABASE INSERT SUCCESSFUL");

    // Trigger automatic historical data sync (non-blocking)
    triggerHistoricalDataSync(
      metaapi_account_id,
      supabaseUrl,
      token
    ).catch(error => {
      console.error("[metaapi-connect-existing] Background sync error:", error);
    });

    console.log("[metaapi-connect-existing] ========== REQUEST COMPLETE ==========");
    
    return new Response(
      JSON.stringify({
        success: true,
        metaapi_account_id: metaapi_account_id,
        connection_id: insertData?.[0]?.id,
        message: "MT account connected successfully. Historical data sync started in background.",
        auto_sync_triggered: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[metaapi-connect-existing] ❌ UNHANDLED ERROR");
    console.error("[metaapi-connect-existing] Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        statusCode: 500,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});