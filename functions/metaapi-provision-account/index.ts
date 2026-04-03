import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProvisionAccountRequest {
  login: string;
  server: string;
  password: string;
  platform: 'mt4' | 'mt5';
  account_id: string;
  name?: string;
}

// Helper function to trigger historical data sync
async function triggerHistoricalDataSync(
  metaApiAccountId: string,
  supabaseUrl: string,
  authToken: string
): Promise<void> {
  console.log("[metaapi-provision] ========== TRIGGERING AUTO-SYNC ==========");
  console.log("[metaapi-provision] Starting automatic historical data sync for account:", metaApiAccountId);
  
  try {
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
      console.log("[metaapi-provision] ✅ Auto-sync completed successfully:", syncResult);
    } else {
      const errorText = await syncResponse.text();
      console.error("[metaapi-provision] ⚠️ Auto-sync failed:", syncResponse.status, errorText);
    }
  } catch (error) {
    console.error("[metaapi-provision] ⚠️ Auto-sync error:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[metaapi-provision] ========== REQUEST START ==========");
    console.log("[metaapi-provision] Request received at:", new Date().toISOString());

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[metaapi-provision] No Authorization header");
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

    const token = authHeader.replace('Bearer ', '');
    console.log("[metaapi-provision] Token extracted, length:", token.length);

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
    console.log("[metaapi-provision] User ID:", user?.id);
    
    if (authError || !user) {
      console.error("[metaapi-provision] Authentication failed:", authError);
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

    const body: ProvisionAccountRequest = await req.json();
    console.log("[metaapi-provision] ========== REQUEST BODY ==========");
    console.log("[metaapi-provision] Login:", body.login);
    console.log("[metaapi-provision] Server:", body.server);
    console.log("[metaapi-provision] Platform:", body.platform);
    console.log("[metaapi-provision] Account ID:", body.account_id);

    const { login, server, password, platform, account_id, name } = body;

    if (!login || !server || !password || !platform || !account_id) {
      console.error("[metaapi-provision] Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: login, server, password, platform, and account_id are required",
          statusCode: 400,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[metaapi-provision] ========== METAAPI PROVISIONING ==========");
    
    const metaApiToken = Deno.env.get("METAAPI_TOKEN");
    if (!metaApiToken) {
      console.error("[metaapi-provision] METAAPI_TOKEN not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "MetaAPI token not configured. Please contact administrator.",
          statusCode: 500,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Create MetaAPI account
    const provisionUrl = "https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts";
    
    const accountName = name || `${platform.toUpperCase()}-${login}`;
    const provisionPayload = {
      name: accountName,
      type: "cloud",
      login: login,
      password: password,
      server: server,
      platform: platform,
      magic: 0,
      application: "MetaApi",
      copyFactoryRoles: [],
    };

    console.log("[metaapi-provision] Provisioning payload:", {
      ...provisionPayload,
      password: "***REDACTED***"
    });

    const provisionResponse = await fetch(provisionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "auth-token": metaApiToken,
      },
      body: JSON.stringify(provisionPayload),
    });

    const provisionData = await provisionResponse.json();
    
    if (!provisionResponse.ok) {
      console.error("[metaapi-provision] ❌ PROVISIONING FAILED");
      console.error("[metaapi-provision] Status:", provisionResponse.status);
      console.error("[metaapi-provision] Response:", provisionData);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to provision MetaAPI account: ${JSON.stringify(provisionData)}`,
          statusCode: provisionResponse.status,
        }),
        {
          status: provisionResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[metaapi-provision] ✅ PROVISIONING SUCCESSFUL");
    console.log("[metaapi-provision] MetaAPI Account ID:", provisionData.id);

    // Step 2: Deploy the account
    console.log("[metaapi-provision] ========== DEPLOYING ACCOUNT ==========");
    
    const deployUrl = `https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts/${provisionData.id}/deploy`;
    
    const deployResponse = await fetch(deployUrl, {
      method: "POST",
      headers: {
        "auth-token": metaApiToken,
      },
    });

    if (!deployResponse.ok) {
      const deployError = await deployResponse.text();
      console.error("[metaapi-provision] ⚠️ DEPLOYMENT FAILED");
      console.error("[metaapi-provision] Status:", deployResponse.status);
      console.error("[metaapi-provision] Error:", deployError);
      
      // Account created but deployment failed - still save the connection
      console.log("[metaapi-provision] Account created but not deployed, saving connection anyway");
    } else {
      console.log("[metaapi-provision] ✅ DEPLOYMENT SUCCESSFUL");
    }

    // Step 3: Store connection in database
    console.log("[metaapi-provision] ========== DATABASE INSERTION ==========");
    
    // Simple encryption for password (base64 encoding)
    // Note: For production, use proper encryption with a secret key
    const encryptedPassword = btoa(password);
    
    const dbRecord = {
      user_id: user.id,
      account_id: account_id,
      login: login,
      server: server,
      broker: server.split('-')[0] || 'Unknown',
      metaapi_account_id: provisionData.id,
      platform: platform,
      investor_password_encrypted: encryptedPassword,
      connection_status: "connected",
      connection_method: "metaapi",
      metaapi_deployed_at: new Date().toISOString(),
      last_sync_time: new Date().toISOString(),
    };
    
    console.log("[metaapi-provision] Database record to insert:", {
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
      console.log("[metaapi-provision] ⚠️ Connection already exists, updating...");
      
      const { error: updateError } = await supabase
        .from("mt_connections")
        .update(dbRecord)
        .eq("id", existingConnection.id);

      if (updateError) {
        console.error("[metaapi-provision] ❌ DATABASE UPDATE FAILED");
        console.error("[metaapi-provision] Error:", updateError);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Database error: ${updateError.message}`,
            statusCode: 500,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      const { data: insertData, error: dbError } = await supabase
        .from("mt_connections")
        .insert(dbRecord)
        .select();

      if (dbError) {
        console.error("[metaapi-provision] ❌ DATABASE INSERT FAILED");
        console.error("[metaapi-provision] Error:", dbError);
        
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

      console.log("[metaapi-provision] ✅ DATABASE INSERT SUCCESSFUL");
    }

    // Step 4: Trigger automatic historical data sync (non-blocking)
    triggerHistoricalDataSync(
      provisionData.id,
      supabaseUrl,
      token
    ).catch(error => {
      console.error("[metaapi-provision] Background sync error:", error);
    });

    console.log("[metaapi-provision] ========== REQUEST COMPLETE ==========");
    
    return new Response(
      JSON.stringify({
        success: true,
        metaapi_account_id: provisionData.id,
        message: "MT account provisioned and connected successfully. Historical data sync started in background.",
        auto_sync_triggered: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[metaapi-provision] ❌ UNHANDLED ERROR");
    console.error("[metaapi-provision] Error:", error);
    
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