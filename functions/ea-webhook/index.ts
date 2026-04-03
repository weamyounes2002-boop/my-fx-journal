import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  margin_level?: number;
  credit?: number;
}

interface OpenPosition {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  current_price: number;
  profit: number;
  swap?: number;
  commission?: number;
  stop_loss?: number;
  take_profit?: number;
  open_time: string;
  comment?: string;
}

interface ClosedTrade {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number;
  profit: number;
  swap?: number;
  commission?: number;
  open_time: string;
  close_time: string;
  comment?: string;
}

interface EAWebhookRequest {
  account_id: string;
  account_number?: string;
  broker?: string;
  server?: string;
  account_info?: AccountInfo;
  open_positions?: OpenPosition[];
  closed_trades?: ClosedTrade[];
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[EA Webhook] ========== REQUEST START ==========");
    console.log("[EA Webhook] Request received at:", new Date().toISOString());
    console.log("[EA Webhook] Method:", req.method);

    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST.",
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[EA Webhook] No Authorization header");
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

    const token = authHeader.replace("Bearer ", "");
    console.log("[EA Webhook] Token extracted, length:", token.length);

    // Initialize Supabase client
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    console.log("[EA Webhook] User ID:", user?.id);

    if (authError || !user) {
      console.error("[EA Webhook] Authentication failed:", authError);
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

    // Parse request body
    const body: EAWebhookRequest = await req.json();
    console.log("[EA Webhook] ========== REQUEST BODY ==========");
    console.log("[EA Webhook] Account ID:", body.account_id);
    console.log("[EA Webhook] Account Number:", body.account_number);
    console.log("[EA Webhook] Broker:", body.broker);
    console.log("[EA Webhook] Server:", body.server);
    console.log(
      "[EA Webhook] Has Account Info:",
      !!body.account_info
    );
    console.log(
      "[EA Webhook] Open Positions Count:",
      body.open_positions?.length || 0
    );
    console.log(
      "[EA Webhook] Closed Trades Count:",
      body.closed_trades?.length || 0
    );

    const { account_id, account_number, broker, server } = body;

    // Validate required fields
    if (!account_id) {
      console.error("[EA Webhook] Missing account_id");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required field: account_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if account exists and belongs to user
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single();

    if (accountError || !accountData) {
      console.error("[EA Webhook] Account not found or unauthorized:", accountError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Account not found or you don't have permission to access it",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let storedCount = 0;

    // Store account info if provided
    if (body.account_info) {
      console.log("[EA Webhook] Storing account info...");
      
      const { error: metricsError } = await supabase
        .from("account_metrics_history")
        .insert({
          user_id: user.id,
          account_id: account_id,
          balance: body.account_info.balance,
          equity: body.account_info.equity,
          margin: body.account_info.margin,
          free_margin: body.account_info.free_margin,
          margin_level: body.account_info.margin_level || 0,
          credit: body.account_info.credit || 0,
        });

      if (metricsError) {
        console.error("[EA Webhook] Failed to store account metrics:", metricsError);
      } else {
        console.log("[EA Webhook] ✅ Account metrics stored");
        storedCount++;
      }
    }

    // Store open positions if provided
    if (body.open_positions && body.open_positions.length > 0) {
      console.log("[EA Webhook] Storing open positions...");

      // Clear existing positions for this account
      await supabase
        .from("open_positions")
        .delete()
        .eq("user_id", user.id)
        .eq("account_id", account_id);

      const positionsToInsert = body.open_positions.map((pos) => ({
        user_id: user.id,
        account_id: account_id,
        position_id: pos.ticket.toString(),
        symbol: pos.symbol,
        position_type: pos.type.toLowerCase(),
        volume: pos.volume,
        open_price: pos.open_price,
        current_price: pos.current_price,
        stop_loss: pos.stop_loss,
        take_profit: pos.take_profit,
        profit: pos.profit,
        swap: pos.swap || 0,
        commission: pos.commission || 0,
        open_time: pos.open_time,
      }));

      const { error: positionsError } = await supabase
        .from("open_positions")
        .insert(positionsToInsert);

      if (positionsError) {
        console.error("[EA Webhook] Failed to store positions:", positionsError);
      } else {
        console.log("[EA Webhook] ✅ Stored", body.open_positions.length, "positions");
        storedCount += body.open_positions.length;
      }
    }

    // Store closed trades if provided
    if (body.closed_trades && body.closed_trades.length > 0) {
      console.log("[EA Webhook] Storing closed trades...");

      const tradesToInsert = body.closed_trades.map((trade) => ({
        user_id: user.id,
        account_id: account_id,
        ticket: trade.ticket.toString(),
        symbol: trade.symbol,
        trade_type: trade.type.toLowerCase(),
        volume: trade.volume,
        open_price: trade.open_price,
        close_price: trade.close_price,
        profit: trade.profit,
        swap: trade.swap || 0,
        commission: trade.commission || 0,
        open_time: trade.open_time,
        close_time: trade.close_time,
        comment: trade.comment,
      }));

      // Use upsert to avoid duplicates
      const { error: tradesError } = await supabase
        .from("trades")
        .upsert(tradesToInsert, {
          onConflict: "user_id,account_id,ticket",
          ignoreDuplicates: false,
        });

      if (tradesError) {
        console.error("[EA Webhook] Failed to store trades:", tradesError);
      } else {
        console.log("[EA Webhook] ✅ Stored", body.closed_trades.length, "trades");
        storedCount += body.closed_trades.length;
      }
    }

    // Update MT connection if account number/broker/server provided
    if (account_number || broker || server) {
      console.log("[EA Webhook] Updating MT connection info...");
      
      const updateData: any = {
        last_sync_time: new Date().toISOString(),
        connection_status: "connected",
      };
      
      if (account_number) updateData.login = account_number;
      if (broker) updateData.broker = broker;
      if (server) updateData.server = server;

      const { error: updateError } = await supabase
        .from("mt_connections")
        .update(updateData)
        .eq("user_id", user.id)
        .eq("account_id", account_id);

      if (updateError) {
        console.warn("[EA Webhook] Failed to update MT connection:", updateError);
      } else {
        console.log("[EA Webhook] ✅ MT connection updated");
      }
    }

    console.log("[EA Webhook] ========== REQUEST COMPLETE ==========");
    console.log("[EA Webhook] Total items stored:", storedCount);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Trade data received and stored successfully",
        data: {
          account_id: account_id,
          items_stored: storedCount,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[EA Webhook] ❌ UNHANDLED ERROR");
    console.error("[EA Webhook] Error:", error);

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