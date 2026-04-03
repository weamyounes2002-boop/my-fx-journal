import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoSyncPreference {
  user_id: string;
  auto_sync_enabled: boolean;
  account_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Daily Auto-Sync] Starting daily auto-sync job...');

    // Check if it's weekend (Saturday = 6, Sunday = 0)
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('[Daily Auto-Sync] Skipping sync - weekend detected');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Skipped - weekend',
          skipped: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all users with auto-sync enabled
    // This would require a new table to store user preferences
    // For now, we'll sync all MT connections
    const { data: mtConnections, error: fetchError } = await supabase
      .from('mt_connections')
      .select('account_id, user_id, last_synced_date')
      .eq('status', 'connected');

    if (fetchError) {
      console.error('[Daily Auto-Sync] Error fetching MT connections:', fetchError);
      throw new Error(`Failed to fetch MT connections: ${fetchError.message}`);
    }

    if (!mtConnections || mtConnections.length === 0) {
      console.log('[Daily Auto-Sync] No connected accounts found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No accounts to sync',
          accountsSynced: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Daily Auto-Sync] Found ${mtConnections.length} connected accounts`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Sync each account
    for (const connection of mtConnections) {
      try {
        console.log(`[Daily Auto-Sync] Syncing account ${connection.account_id}...`);

        // Call the metaapi-fetch-history function for incremental sync
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/metaapi-fetch-history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            account_id: connection.account_id,
            // No start_time = incremental sync from last_synced_date
          }),
        });

        const syncResult = await syncResponse.json();

        if (syncResponse.ok && syncResult.success) {
          console.log(`[Daily Auto-Sync] Successfully synced account ${connection.account_id}`);
          successCount++;
          results.push({
            account_id: connection.account_id,
            success: true,
            trades_synced: syncResult.data?.trades?.length || 0,
          });

          // Update last_synced_date
          await supabase
            .from('mt_connections')
            .update({ last_synced_date: new Date().toISOString() })
            .eq('account_id', connection.account_id);
        } else {
          console.error(`[Daily Auto-Sync] Failed to sync account ${connection.account_id}:`, syncResult.error);
          failureCount++;
          results.push({
            account_id: connection.account_id,
            success: false,
            error: syncResult.error,
          });
        }

        // Small delay between accounts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Daily Auto-Sync] Error syncing account ${connection.account_id}:`, error);
        failureCount++;
        results.push({
          account_id: connection.account_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[Daily Auto-Sync] Completed: ${successCount} success, ${failureCount} failures`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily auto-sync completed`,
        accountsSynced: successCount,
        accountsFailed: failureCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Daily Auto-Sync] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});