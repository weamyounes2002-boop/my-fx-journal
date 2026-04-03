import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METAAPI_BASE_URL = 'https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai';
const METAAPI_PROVISIONING_URL = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';

interface FetchHistoryRequest {
  account_id: string;
  start_time?: string;
  end_time?: string;
}

async function deployAndWait(metaApiAccountId: string, token: string): Promise<boolean> {
  try {
    console.log('[fetch-history] Deploying account:', metaApiAccountId);

    const deployRes = await fetch(
      `${METAAPI_PROVISIONING_URL}/users/current/accounts/${metaApiAccountId}/deploy`,
      {
        method: 'POST',
        headers: { 'auth-token': token },
      }
    );

    if (!deployRes.ok && deployRes.status !== 204) {
      console.error('[fetch-history] Deploy failed:', await deployRes.text());
      return false;
    }

    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const stateRes = await fetch(
        `${METAAPI_PROVISIONING_URL}/users/current/accounts/${metaApiAccountId}`,
        { headers: { 'auth-token': token } }
      );

      if (!stateRes.ok) continue;

      const stateData = await stateRes.json();

      if (
        stateData.connectionStatus === 'CONNECTED' ||
        stateData.state === 'DEPLOYED'
      ) {
        return true;
      }

      if (stateData.state === 'ERROR') {
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[fetch-history] deployAndWait error:', err);
    return false;
  }
}

async function undeploy(metaApiAccountId: string, token: string): Promise<void> {
  try {
    await fetch(
      `${METAAPI_PROVISIONING_URL}/users/current/accounts/${metaApiAccountId}/undeploy`,
      {
        method: 'POST',
        headers: { 'auth-token': token },
      }
    );
  } catch (e) {
    console.error('[fetch-history] undeploy error:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ✅ FIX 1: Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ FIX 2: Safe client creation
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // ✅ FIX 3: Proper user validation
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ FIX 4: Safe JSON parsing
    let body: FetchHistoryRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { account_id, start_time, end_time } = body;

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: 'account_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ FIX 5: Safer DB query
    const { data: connection, error: connError } = await supabaseClient
      .from('mt_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', account_id)
      .maybeSingle();

    if (connError || !connection?.metaapi_account_id) {
      return new Response(
        JSON.stringify({ error: 'MT connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metaApiToken = Deno.env.get('METAAPI_TOKEN');
    if (!metaApiToken) {
      return new Response(
        JSON.stringify({ error: 'METAAPI_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metaApiAccountId = connection.metaapi_account_id;

    const ready = await deployAndWait(metaApiAccountId, metaApiToken);
    if (!ready) {
      return new Response(
        JSON.stringify({ error: 'Account failed to connect' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startIso =
      start_time ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const endIso = end_time ?? new Date().toISOString();

    const dealsRes = await fetch(
      `${METAAPI_BASE_URL}/users/current/accounts/${metaApiAccountId}/history-deals/time/${encodeURIComponent(startIso)}/${encodeURIComponent(endIso)}`,
      { headers: { 'auth-token': metaApiToken } }
    );

    if (!dealsRes.ok) {
      await undeploy(metaApiAccountId, metaApiToken);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch history' }),
        { status: dealsRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deals = await dealsRes.json();

    // metrics
    let metrics = null;
    try {
      const res = await fetch(
        `${METAAPI_BASE_URL}/users/current/accounts/${metaApiAccountId}/account-information`,
        { headers: { 'auth-token': metaApiToken } }
      );
      if (res.ok) {
        const info = await res.json();
        metrics = info;
      }
    } catch {}

    // positions
    let positions = [];
    try {
      const res = await fetch(
        `${METAAPI_BASE_URL}/users/current/accounts/${metaApiAccountId}/positions`,
        { headers: { 'auth-token': metaApiToken } }
      );
      if (res.ok) positions = await res.json();
    } catch {}

    await undeploy(metaApiAccountId, metaApiToken);

    const trades = deals.map((deal: any) => ({
      id: deal.id ?? deal.positionId,
      type: deal.type,
      state: deal.entryType === 'DEAL_ENTRY_OUT' ? 'closed' : 'open',
      symbol: deal.symbol,
      time: deal.time,
      volume: deal.volume,
      openPrice: deal.price,
      closePrice: deal.price,
      profit: deal.profit,
    }));

    return new Response(
      JSON.stringify({ success: true, data: { trades, metrics, positions } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-history] Fatal error:', error);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});