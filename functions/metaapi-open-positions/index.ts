import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METAAPI_BASE_URL = Deno.env.get('METAAPI_CLIENT_BASE_URL') || 'https://mt-client-api-v1.agiliumtrade.ai';

interface PositionsRequest {
  account_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[MetaAPI Open Positions] Authorization header:', authHeader?.substring(0, 50) + '...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError) {
      console.error('[MetaAPI Open Positions] Auth error:', authError);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed', 
        details: authError.message,
        code: authError.code,
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user) {
      console.error('[MetaAPI Open Positions] No user returned from getUser()');
      return new Response(JSON.stringify({ error: 'Unauthorized - no user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[MetaAPI Open Positions] User authenticated:', user.id);

    const requestData: PositionsRequest = await req.json();
    const { account_id } = requestData;

    console.log('[MetaAPI Open Positions] Request:', { account_id, user_id: user.id });

    // Get the MT connection for this account
    const { data: connection, error: connectionError } = await supabaseClient
      .from('mt_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', account_id)
      .single();

    if (connectionError || !connection) {
      console.error('[MetaAPI Open Positions] Connection not found:', connectionError);
      return new Response(
        JSON.stringify({ error: 'MT connection not found for this account' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!connection.metaapi_account_id) {
      return new Response(
        JSON.stringify({ error: 'Account not connected to MetaAPI' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const metaApiToken = Deno.env.get('METAAPI_TOKEN');
    if (!metaApiToken) {
      console.error('[MetaAPI Open Positions] MetaAPI token not configured');
      return new Response(
        JSON.stringify({ error: 'MetaAPI not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch open positions from MetaAPI
    const positionsUrl = `${METAAPI_BASE_URL}/users/current/accounts/${connection.metaapi_account_id}/positions`;
    
    const response = await fetch(positionsUrl, {
      headers: {
        'auth-token': metaApiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MetaAPI Open Positions] Failed to fetch positions:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch open positions from MetaAPI' }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const positions = await response.json();
    console.log(`[MetaAPI Open Positions] Fetched ${positions.length} positions`);

    // Clear existing positions for this account
    await supabaseClient
      .from('open_positions')
      .delete()
      .eq('user_id', user.id)
      .eq('account_id', account_id);

    // Store positions in database
    if (positions.length > 0) {
      const positionsToInsert = positions.map((pos: any) => ({
        user_id: user.id,
        account_id: account_id,
        position_id: pos.id,
        symbol: pos.symbol,
        position_type: pos.type,
        volume: pos.volume,
        open_price: pos.openPrice,
        current_price: pos.currentPrice,
        stop_loss: pos.stopLoss,
        take_profit: pos.takeProfit,
        profit: pos.profit,
        swap: pos.swap,
        commission: pos.commission,
        open_time: pos.time,
      }));

      const { error: insertError } = await supabaseClient
        .from('open_positions')
        .insert(positionsToInsert);

      if (insertError) {
        console.error('[MetaAPI Open Positions] Failed to store positions:', insertError);
      }
    }

    // Transform positions to our format
    const transformedPositions = positions.map((pos: any) => ({
      id: pos.id,
      symbol: pos.symbol,
      type: pos.type,
      volume: pos.volume,
      openPrice: pos.openPrice,
      currentPrice: pos.currentPrice,
      stopLoss: pos.stopLoss,
      takeProfit: pos.takeProfit,
      profit: pos.profit,
      swap: pos.swap,
      commission: pos.commission,
      openTime: pos.time,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedPositions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[MetaAPI Open Positions] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
