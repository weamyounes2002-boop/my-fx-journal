import { supabase } from '@/lib/supabase';
import { fetchAccountMetrics, fetchOpenPositions } from '@/api/metaApiClient';

interface SyncResult {
  success: boolean;
  tradesImported?: number;
  error?: string;
}

export const syncTrades = async (
  _metaApiAccountId: string,
  supabaseAccountId: string,
  _userId: string
): Promise<SyncResult> => {
  try {
    console.log('[metaapiSync] Starting trade sync for account:', supabaseAccountId);

    const { syncHistoricalData } = await import('@/api/metaApiClient');
    const result = await syncHistoricalData(supabaseAccountId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to sync trades',
      };
    }

    const tradesImported = (result.data as { tradesCount?: number })?.tradesCount || 0;
    console.log(`[metaapiSync] Trade sync completed. Imported ${tradesImported} trades.`);
    return { success: true, tradesImported };
  } catch (error) {
    console.error('[metaapiSync] Error syncing trades:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync trades',
    };
  }
};

export const backgroundSync = async () => {
  try {
    // Always get a fresh session before doing anything
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.log('[metaapiSync] No valid session, skipping background sync');
      return;
    }

    const user = session.user;

    const { data: connections, error } = await supabase
      .from('mt_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .not('metaapi_account_id', 'is', null);

    if (error) {
      console.error('[metaapiSync] Error fetching connections:', error);
      return;
    }

    if (!connections || connections.length === 0) {
      console.log('[metaapiSync] No active connections to sync');
      return;
    }

    console.log(`[metaapiSync] Background sync for ${connections.length} connections`);

    for (const connection of connections) {
      try {
        // Background sync only updates metrics and positions
        // Full trade history sync is triggered manually by the user via the Sync button
        await fetchAccountMetrics(connection.account_id);
        await fetchOpenPositions(connection.account_id);

        console.log(`[metaapiSync] Updated metrics for account ${connection.account_id}`);
      } catch (error) {
        console.error(`[metaapiSync] Error updating account ${connection.account_id}:`, error);
      }
    }

    console.log('[metaapiSync] Background sync completed');
  } catch (error) {
    console.error('[metaapiSync] Error in background sync:', error);
  }
};

export const startBackgroundSync = () => {
  console.log('[metaapiSync] Starting background sync service');

  // Wait 60 seconds on startup so session is fully established
  const initialTimeout = setTimeout(() => {
    backgroundSync();
  }, 60000);

  // Run every 10 minutes
  const interval = setInterval(() => {
    backgroundSync();
  }, 10 * 60 * 1000);

  return () => {
    clearTimeout(initialTimeout);
    clearInterval(interval);
  };
};