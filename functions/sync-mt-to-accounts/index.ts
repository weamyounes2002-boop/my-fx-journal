import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[sync-mt-to-accounts] ========== SYNC START ==========");
    console.log("[sync-mt-to-accounts] Request received at:", new Date().toISOString());

    // Get and validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[sync-mt-to-accounts] No Authorization header");
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

    // Extract token by removing "Bearer " prefix
    const token = authHeader.replace('Bearer ', '');
    console.log("[sync-mt-to-accounts] Token extracted, length:", token.length);

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
    console.log("[sync-mt-to-accounts] User ID:", user?.id);
    
    if (authError || !user) {
      console.error("[sync-mt-to-accounts] Authentication failed:", authError);
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

    console.log("[sync-mt-to-accounts] ========== FETCHING MT CONNECTIONS ==========");

    // Fetch all mt_connections for this user
    const { data: mtConnections, error: fetchError } = await supabase
      .from("mt_connections")
      .select("*")
      .eq("user_id", user.id);

    if (fetchError) {
      console.error("[sync-mt-to-accounts] Failed to fetch mt_connections:", fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch connections: ${fetchError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[sync-mt-to-accounts] Found", mtConnections?.length || 0, "mt_connections");

    if (!mtConnections || mtConnections.length === 0) {
      console.log("[sync-mt-to-accounts] No connections to sync");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No connections to sync",
          synced: 0,
          updated: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[sync-mt-to-accounts] ========== SYNCING TO ACCOUNTS TABLE ==========");

    let syncedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const connection of mtConnections) {
      try {
        console.log("[sync-mt-to-accounts] Processing connection:", connection.id);

        // Generate account name from broker and login
        const accountName = connection.broker 
          ? `${connection.broker} Account ${connection.login}`
          : `MT Account ${connection.login}`;

        // Check if account already exists (by account_number and user_id)
        const { data: existingAccount, error: checkError } = await supabase
          .from("accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("account_number", connection.login)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 is "not found" error, which is expected for new accounts
          console.error("[sync-mt-to-accounts] Error checking existing account:", checkError);
          errors.push(`${connection.login}: ${checkError.message}`);
          continue;
        }

        const accountData = {
          user_id: user.id,
          name: accountName,
          broker: connection.broker || "MetaTrader 5",
          account_number: connection.login,
          balance: connection.account_balance || 0,
          currency: "USD", // Default to USD, can be updated later
        };

        if (existingAccount) {
          // Update existing account
          console.log("[sync-mt-to-accounts] Updating existing account:", existingAccount.id);
          
          const { error: updateError } = await supabase
            .from("accounts")
            .update({
              name: accountData.name,
              broker: accountData.broker,
              balance: accountData.balance,
            })
            .eq("id", existingAccount.id);

          if (updateError) {
            console.error("[sync-mt-to-accounts] Failed to update account:", updateError);
            errors.push(`${connection.login}: ${updateError.message}`);
          } else {
            console.log("[sync-mt-to-accounts] ✅ Updated account successfully");
            updatedCount++;
          }
        } else {
          // Insert new account
          console.log("[sync-mt-to-accounts] Creating new account");
          
          const { error: insertError } = await supabase
            .from("accounts")
            .insert(accountData);

          if (insertError) {
            console.error("[sync-mt-to-accounts] Failed to insert account:", insertError);
            errors.push(`${connection.login}: ${insertError.message}`);
          } else {
            console.log("[sync-mt-to-accounts] ✅ Created account successfully");
            syncedCount++;
          }
        }
      } catch (error) {
        console.error("[sync-mt-to-accounts] Error processing connection:", error);
        errors.push(`${connection.login}: ${error.message}`);
      }
    }

    console.log("[sync-mt-to-accounts] ========== SYNC COMPLETE ==========");
    console.log("[sync-mt-to-accounts] New accounts:", syncedCount);
    console.log("[sync-mt-to-accounts] Updated accounts:", updatedCount);
    console.log("[sync-mt-to-accounts] Errors:", errors.length);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} new accounts, updated ${updatedCount} accounts`,
        synced: syncedCount,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[sync-mt-to-accounts] ❌ UNHANDLED ERROR");
    console.error("[sync-mt-to-accounts] Error:", error);
    
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