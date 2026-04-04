import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConnectRequest {
  platform_type: string;
  login_number: string;
  broker_server: string;
  investor_password: string;
  account_id: string;
  broker_name: string;
}

const METAAPI_PROVISIONING_BASE_URL =
  Deno.env.get("METAAPI_PROVISIONING_BASE_URL") || "https://mt-provisioning-api-v1.agiliumtrade.ai";

// Helper function to trigger historical data sync
async function triggerHistoricalDataSync(
  metaApiAccountId: string,
  metaApiToken: string,
  supabaseUrl: string,
  supabaseKey: string,
  authToken: string
): Promise<void> {
  console.log("[metaapi-connect] ========== TRIGGERING AUTO-SYNC ==========");
  console.log("[metaapi-connect] Starting automatic historical data sync for account:", metaApiAccountId);
  
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
      console.log("[metaapi-connect] ✅ Auto-sync completed successfully:", syncResult);
    } else {
      const errorText = await syncResponse.text();
      console.error("[metaapi-connect] ⚠️ Auto-sync failed:", syncResponse.status, errorText);
    }
  } catch (error) {
    console.error("[metaapi-connect] ⚠️ Auto-sync error:", error);
    // Don't fail the connection if sync fails
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[metaapi-connect] ========== REQUEST START ==========");
    console.log("[metaapi-connect] Request received at:", new Date().toISOString());

    // Get MetaAPI token from environment
    const metaApiToken = Deno.env.get("METAAPI_TOKEN");
    if (!metaApiToken) {
      console.error("[metaapi-connect] METAAPI_TOKEN not found in environment");
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
      console.error("[metaapi-connect] No Authorization header");
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
    console.log("[metaapi-connect] Token extracted, length:", token.length);

    // Initialize Supabase client with the user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    console.log("[metaapi-connect] Supabase URL:", supabaseUrl);
    console.log("[metaapi-connect] Using ANON key for RLS enforcement");
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log("[metaapi-connect] ========== AUTH CHECK ==========");
    console.log("[metaapi-connect] User ID:", user?.id);
    console.log("[metaapi-connect] User Email:", user?.email);
    console.log("[metaapi-connect] Auth Error:", authError?.message);
    
    if (authError || !user) {
      console.error("[metaapi-connect] Authentication failed:", authError);
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
    const body: ConnectRequest = await req.json();
    console.log("[metaapi-connect] ========== REQUEST BODY ==========");
    console.log("[metaapi-connect] Platform:", body.platform_type);
    console.log("[metaapi-connect] Login:", body.login_number);
    console.log("[metaapi-connect] Server:", body.broker_server);
    console.log("[metaapi-connect] Broker:", body.broker_name);
    console.log("[metaapi-connect] Account ID:", body.account_id);

    const {
      platform_type,
      login_number,
      broker_server,
      investor_password,
      account_id,
      broker_name,
    } = body;

    // Validate required fields
    if (
      !platform_type ||
      !login_number ||
      !broker_server ||
      !investor_password ||
      !account_id
    ) {
      console.error("[metaapi-connect] Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
          statusCode: 400,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[metaapi-connect] ========== METAAPI ACCOUNT CREATION ==========");
    console.log("[metaapi-connect] Creating MetaAPI account via REST API");

    // Step 1: Create MetaAPI account using REST API with correct required fields
    const createAccountUrl = `${METAAPI_PROVISIONING_BASE_URL}/users/current/accounts`;
    const accountPayload = {
      name: `${broker_name || "MT"} Account ${login_number}`,
      type: "cloud",
      login: login_number,
      password: investor_password,
      server: broker_server,
      platform: platform_type,
      magic: 0,
      application: "MetaApi",
    };

    console.log("[metaapi-connect] Account payload:", {
      ...accountPayload,
      password: "***",
    });

    const createResponse = await fetch(createAccountUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "auth-token": metaApiToken,
      },
      body: JSON.stringify(accountPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(
        "[metaapi-connect] Failed to create account:",
        createResponse.status,
        errorText
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create MetaAPI account: ${errorText}`,
          statusCode: createResponse.status,
        }),
        {
          status: createResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accountData = await createResponse.json();
    const metaApiAccountId = accountData.id;
    console.log("[metaapi-connect] ✅ Account created successfully");
    console.log("[metaapi-connect] MetaAPI Account ID:", metaApiAccountId);

    // Step 2: Deploy the account
    console.log("[metaapi-connect] ========== METAAPI DEPLOYMENT ==========");
    console.log("[metaapi-connect] Deploying account");
    const deployUrl = `${METAAPI_PROVISIONING_BASE_URL}/users/current/accounts/${metaApiAccountId}/deploy`;

    const deployResponse = await fetch(deployUrl, {
      method: "POST",
      headers: {
        "auth-token": metaApiToken,
      },
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      console.error(
        "[metaapi-connect] Failed to deploy account:",
        deployResponse.status,
        errorText
      );
      console.log("[metaapi-connect] ⚠️ Continuing despite deployment failure");
    } else {
      console.log("[metaapi-connect] ✅ Account deployed successfully");
    }

    // Step 3: Store in database with comprehensive logging
    console.log("[metaapi-connect] ========== DATABASE INSERTION ==========");
    console.log("[metaapi-connect] Preparing database record");
    
    const dbRecord = {
      user_id: user.id,
      account_id: account_id,
      login: login_number,
      server: broker_server,
      broker: broker_name || null,
      metaapi_account_id: metaApiAccountId,
      connection_status: "connected",
      connection_method: "metaapi",
      last_sync_time: new Date().toISOString(),
    };
    
    console.log("[metaapi-connect] Database record to insert:", {
      ...dbRecord,
      user_id: user.id,
      account_id: account_id,
      login: login_number,
      server: broker_server,
      broker: broker_name || null,
      metaapi_account_id: metaApiAccountId,
    });

    // Test database connectivity first
    console.log("[metaapi-connect] Testing database connectivity...");
    const { data: testData, error: testError } = await supabase
      .from("mt_connections")
      .select("count")
      .limit(1);
    
    if (testError) {
      console.error("[metaapi-connect] ❌ Database connectivity test failed:", testError);
    } else {
      console.log("[metaapi-connect] ✅ Database connectivity test passed");
    }

    // Attempt database insert
    console.log("[metaapi-connect] Inserting record into mt_connections table...");
    const { data: insertData, error: dbError } = await supabase
      .from("mt_connections")
      .insert(dbRecord)
      .select();

    if (dbError) {
      console.error("[metaapi-connect] ❌ DATABASE INSERT FAILED");
      console.error("[metaapi-connect] Error code:", dbError.code);
      console.error("[metaapi-connect] Error message:", dbError.message);
      console.error("[metaapi-connect] Error details:", dbError.details);
      console.error("[metaapi-connect] Error hint:", dbError.hint);
      console.error("[metaapi-connect] Full error object:", JSON.stringify(dbError, null, 2));
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${dbError.message}`,
          error_code: dbError.code,
          error_details: dbError.details,
          error_hint: dbError.hint,
          statusCode: 500,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[metaapi-connect] ✅ DATABASE INSERT SUCCESSFUL");
    console.log("[metaapi-connect] Inserted data:", JSON.stringify(insertData, null, 2));

    // Step 4: Trigger automatic historical data sync (non-blocking)
    // This runs in the background and doesn't block the response
    triggerHistoricalDataSync(
      metaApiAccountId,
      metaApiToken,
      supabaseUrl,
      supabaseKey,
      token
    ).catch(error => {
      console.error("[metaapi-connect] Background sync error:", error);
    });

    console.log("[metaapi-connect] ========== REQUEST COMPLETE ==========");
    
    return new Response(
      JSON.stringify({
        success: true,
        metaapi_account_id: metaApiAccountId,
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
    console.error("[metaapi-connect] ❌ UNHANDLED ERROR");
    console.error("[metaapi-connect] Error type:", error.constructor.name);
    console.error("[metaapi-connect] Error message:", error.message);
    console.error("[metaapi-connect] Error stack:", error.stack);
    
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
