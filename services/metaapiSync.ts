import { supabase } from '@/lib/supabase';
import { syncHistoricalData, fetchAccountMetrics } from '@/api/metaApiClient';

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

    // Fix: use correct column name 'status' not 'connection_status'
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

    console.log(`[metaapiSync] Starting background sync for ${connections.length} connections`);

    for (const connection of connections) {
      try {
        const result = await syncHistoricalData(connection.account_id);

        if (result.success) {
          console.log(`[metaapiSync] Synced account ${connection.account_id}: ${result.message}`);
        } else {
          if (!result.error?.includes('Please wait')) {
            console.warn(`[metaapiSync] Failed to sync account ${connection.account_id}:`, result.error);
          }
        }

        // Only fetch metrics if sync succeeded or we have a valid session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          await fetchAccountMetrics(connection.account_id);
        }

      } catch (error) {
        console.error(`[metaapiSync] Error syncing connection ${connection.id}:`, error);
      }
    }

    console.log('[metaapiSync] Background sync completed');
  } catch (error) {
    console.error('[metaapiSync] Error in background sync:', error);
  }
};

export const startBackgroundSync = () => {
  console.log('[metaapiSync] Starting background sync service');

  // Fix: wait 30 seconds on startup so the session is fully established
  const initialTimeout = setTimeout(() => {
    backgroundSync();
  }, 30000);

  // Sync every 10 minutes
  const interval = setInterval(() => {
    backgroundSync();
  }, 10 * 60 * 1000);

  return () => {
    clearTimeout(initialTimeout);
    clearInterval(interval);
  };
};