import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METAAPI_BASE_URL = 'https://mt-client-api-v1.agiliumtrade.ai';

interface MetricsRequest {
  account_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    // ── Service role client (for DB writes — works in background sync too) ────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── User client (to verify the token when called from frontend) ───────────
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    // Try to get user — if it fails (background sync), still allow with service role
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { account_id }: MetricsRequest = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[account-metrics] Fetching metrics for account:', account_id, 'user:', user?.id ?? 'background-sync');

    // ── Get MT connection using admin client (works with or without user session)
    const query = supabaseAdmin
      .from('mt_connections')
      .select('*')
      .eq('account_id', account_id);

    // If we have a user, filter by user_id for security
    if (user) query.eq('user_id', user.id);

    const { data: connection, error: connError } = await query.single();

    if (connError || !connection?.metaapi_account_id) {
      console.error('[account-metrics] Connection not found:', connError);
      return new Response(
        JSON.stringify({ error: 'MT connection not found for this account' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metaApiToken = Deno.env.get('METAAPI_TOKEN');
    if (!metaApiToken) {
      return new Response(
        JSON.stringify({ error: 'METAAPI_TOKEN not configured in Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Fetch account info from MetaAPI ───────────────────────────────────────
    const response = await fetch(
      `${METAAPI_BASE_URL}/users/current/accounts/${connection.metaapi_account_id}/account-information`,
      { headers: { 'auth-token': metaApiToken } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[account-metrics] MetaAPI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch account metrics from MetaAPI', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountInfo = await response.json();

    const metrics = {
      balance: accountInfo.balance ?? 0,
      equity: accountInfo.equity ?? 0,
      margin: accountInfo.margin ?? 0,
      freeMargin: accountInfo.freeMargin ?? 0,
      marginLevel: accountInfo.marginLevel ?? 0,
      credit: accountInfo.credit ?? 0,
    };

    console.log('[account-metrics] Metrics fetched. Balance:', metrics.balance);

    // ── Update account balance in accounts table ──────────────────────────────
    await supabaseAdmin
      .from('accounts')
      .update({ balance: metrics.balance, equity: metrics.equity })
      .eq('id', account_id);

    // ── Store in metrics history ──────────────────────────────────────────────
    await supabaseAdmin
      .from('account_metrics_history')
      .insert({
        user_id: connection.user_id,
        account_id: account_id,
        balance: metrics.balance,
        equity: metrics.equity,
        margin: metrics.margin,
        free_margin: metrics.freeMargin,
        margin_level: metrics.marginLevel,
        credit: metrics.credit,
      })
      .then(({ error }) => {
        if (error) console.warn('[account-metrics] Metrics history insert (non-fatal):', error.message);
      });

    return new Response(
      JSON.stringify({ success: true, data: metrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[account-metrics] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});