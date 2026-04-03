import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoreHistoryRequest {
  account_id: string;
  trades: any[];
  metrics?: any;
  positions?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate user ──────────────────────────────────────────────────
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Parse request ──────────────────────────────────────────────────────
    const { account_id, trades, metrics, positions }: StoreHistoryRequest = await req.json();

    console.log('[store-history] Storing data for account:', account_id, {
      tradesCount: trades?.length ?? 0,
      hasMetrics: !!metrics,
      positionsCount: positions?.length ?? 0,
    });

    // ── 3. Store trades in trades_history ─────────────────────────────────────
    let storedTradesCount = 0;

    if (trades && trades.length > 0) {
      // Process in batches of 100 to avoid timeouts
      const batchSize = 100;

      for (let i = 0; i < trades.length; i += batchSize) {
        const batch = trades.slice(i, i + batchSize);

        const tradeRecords = batch.map((trade: any) => ({
          user_id: user.id,
          account_id: account_id,
          ticket: String(trade.id),
          external_id: String(trade.id),
          magic_number: trade.magic ?? 0,
          symbol: trade.symbol,
          trade_type: trade.type,
          volume: trade.volume,
          open_price: trade.openPrice,
          close_price: trade.closePrice,
          stop_loss: trade.stopLoss ?? null,
          take_profit: trade.takeProfit ?? null,
          open_time: trade.time,
          close_time: trade.closeTime ?? null,
          broker_time: trade.brokerTime ?? null,
          profit: trade.profit ?? 0,
          swap: trade.swap ?? 0,
          commission: trade.commission ?? 0,
          comment: trade.comment ?? null,
          state: trade.state ?? 'closed',
          platform: 'mt5',
        }));

        const { error: upsertError, count } = await supabaseClient
          .from('trades_history')
          .upsert(tradeRecords, {
            onConflict: 'ticket,account_id',
            ignoreDuplicates: true,
          });

        if (upsertError) {
          console.error('[store-history] Batch upsert error:', upsertError);
        } else {
          storedTradesCount += tradeRecords.length;
          console.log(`[store-history] Stored batch ${Math.floor(i / batchSize) + 1}: ${tradeRecords.length} trades`);
        }
      }
    }

    // ── 4. Update account balance/equity in accounts table ────────────────────
    if (metrics) {
      const { error: balanceError } = await supabaseClient
        .from('accounts')
        .update({
          balance: metrics.balance,
          equity: metrics.equity,
        })
        .eq('id', account_id)
        .eq('user_id', user.id);

      if (balanceError) {
        console.warn('[store-history] Failed to update account balance:', balanceError);
      } else {
        console.log('[store-history] Updated account balance:', metrics.balance);
      }

      // Also store in metrics history if table exists
      await supabaseClient
        .from('account_metrics_history')
        .insert({
          user_id: user.id,
          account_id: account_id,
          balance: metrics.balance,
          equity: metrics.equity,
          margin: metrics.margin,
          free_margin: metrics.freeMargin,
          margin_level: metrics.marginLevel,
          credit: metrics.credit,
        })
        .then(({ error }) => {
          if (error) console.warn('[store-history] Metrics history insert (non-fatal):', error.message);
        });
    }

    // ── 5. Store open positions ───────────────────────────────────────────────
    if (positions && positions.length > 0) {
      // Clear old positions for this account first
      await supabaseClient
        .from('open_positions')
        .delete()
        .eq('user_id', user.id)
        .eq('account_id', account_id);

      const positionRecords = positions.map((pos: any) => ({
        user_id: user.id,
        account_id: account_id,
        position_id: String(pos.id),
        symbol: pos.symbol,
        position_type: pos.type,
        volume: pos.volume,
        open_price: pos.openPrice,
        current_price: pos.currentPrice,
        stop_loss: pos.stopLoss ?? null,
        take_profit: pos.takeProfit ?? null,
        profit: pos.profit ?? 0,
        swap: pos.swap ?? 0,
        commission: pos.commission ?? 0,
        open_time: pos.openTime,
      }));

      const { error: posError } = await supabaseClient
        .from('open_positions')
        .insert(positionRecords);

      if (posError) {
        console.warn('[store-history] Failed to store positions:', posError.message);
      } else {
        console.log(`[store-history] Stored ${positionRecords.length} open positions`);
      }
    }

    // ── 6. Update last_synced_date in mt_connections ──────────────────────────
    await supabaseClient
      .from('mt_connections')
      .update({ last_synced_date: new Date().toISOString(), status: 'connected' })
      .eq('account_id', account_id)
      .eq('user_id', user.id);

    console.log(`[store-history] Done. Stored ${storedTradesCount} trades.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully stored ${storedTradesCount} trades`,
        data: { storedTradesCount },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[store-history] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});