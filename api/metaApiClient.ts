import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

interface ProvisionAccountRequest {
  login: string;
  server: string;
  password: string;
  platform: 'mt4' | 'mt5';
  account_id: string;
  name?: string;
}

interface ConnectExistingRequest {
  metaapi_account_id: string;
  platform: 'mt4' | 'mt5';
  account_id: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface MetaApiTrade {
  id: string;
  type: string;
  state: string;
  symbol: string;
  magic: number;
  time: string;
  brokerTime: string;
  volume: number;
  openPrice: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  closeTime?: string;
  profit?: number;
  swap?: number;
  commission?: number;
  comment?: string;
}

interface MetaApiAccountMetrics {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  credit: number;
}

interface MetaApiPosition {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number;
  swap: number;
  commission: number;
  openTime: string;
}

interface HistoricalDataResponse {
  trades: MetaApiTrade[];
  metrics: MetaApiAccountMetrics;
  positions: MetaApiPosition[];
}

interface SyncProgressUpdate {
  stage: string;
  percentage: number;
  currentChunk?: number;
  totalChunks?: number;
  dateRange?: string;
}

/**
 * Robust token refresh using Supabase v2 API
 */
async function getFreshAuthToken(): Promise<string> {
  console.log('[MetaAPI Client] Getting fresh auth token...');

  // ── Fix: use getSession() — supabase.auth.session() does not exist in v2 ──
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[MetaAPI Client] Failed to get session:', sessionError);
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  if (!session) {
    console.warn('[MetaAPI Client] No active session found. User must log in.');
    throw new Error('No active session. Please log in to continue.');
  }

  // If token expires within 60 seconds, refresh it
  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt - now < 60) {
    console.log('[MetaAPI Client] Token expiring soon, refreshing...');
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new Error('Session refresh failed. Please log in again.');
    }
    console.log('[MetaAPI Client] Token refreshed successfully.');
    return data.session.access_token;
  }

  console.log('[MetaAPI Client] Using existing valid token.');
  return session.access_token;
}

/**
 * Check if sync cooldown is active
 */
export function checkSyncCooldown(accountId: string) {
  const key = `last_sync_${accountId}`;
  const lastSyncStr = localStorage.getItem(key);

  if (!lastSyncStr) return { isActive: false, remainingMinutes: 0, lastSyncTime: null };

  const lastSyncTime = new Date(lastSyncStr);
  const diff = Date.now() - lastSyncTime.getTime();

  if (diff < SYNC_COOLDOWN_MS) {
    return { isActive: true, remainingMinutes: Math.ceil((SYNC_COOLDOWN_MS - diff) / 60000), lastSyncTime };
  }

  return { isActive: false, remainingMinutes: 0, lastSyncTime };
}

function updateLastSyncTime(accountId: string) {
  localStorage.setItem(`last_sync_${accountId}`, new Date().toISOString());
}

export function getTimeSinceLastSync(accountId: string): string | null {
  const key = `last_sync_${accountId}`;
  const lastSyncStr = localStorage.getItem(key);
  if (!lastSyncStr) return null;

  const diffMinutes = Math.floor((Date.now() - new Date(lastSyncStr).getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hour${Math.floor(diffMinutes / 60) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffMinutes / 1440)} day${Math.floor(diffMinutes / 1440) > 1 ? 's' : ''} ago`;
}

/**
 * Provision a new MetaAPI account
 */
export async function provisionMetaApiAccount(request: ProvisionAccountRequest): Promise<ApiResponse> {
  try {
    const token = await getFreshAuthToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/metaapi-provision-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    await syncMTConnectionsToAccounts();
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Connect an existing MetaAPI account
 */
export async function connectExistingMetaApiAccount(request: ConnectExistingRequest): Promise<ApiResponse> {
  try {
    const token = await getFreshAuthToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/metaapi-connect-existing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    await syncMTConnectionsToAccounts();
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Sync MT connections to accounts table
 */
export async function syncMTConnectionsToAccounts(): Promise<ApiResponse> {
  try {
    const token = await getFreshAuthToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-mt-to-accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Disconnect MT account
 */
export async function disconnectMetaApiAccount(connectionId: string): Promise<ApiResponse> {
  try {
    const token = await getFreshAuthToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/metaapi-disconnect/${connectionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Fetch historical data
 */
export async function fetchHistoricalData(
  accountId: string,
  startTime?: string,
  endTime?: string,
  token?: string
): Promise<ApiResponse<HistoricalDataResponse>> {
  try {
    const authToken = token || await getFreshAuthToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/metaapi-fetch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ account_id: accountId, start_time: startTime, end_time: endTime }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Fetch account metrics
 */
export async function fetchAccountMetrics(
  accountId: string,
  token?: string
): Promise<ApiResponse<MetaApiAccountMetrics>> {
  try {
    const authToken = token || await getFreshAuthToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/metaapi-account-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ account_id: accountId }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Fetch open positions
 */
export async function fetchOpenPositions(
  accountId: string,
  token?: string
): Promise<ApiResponse<MetaApiPosition[]>> {
  try {
    const authToken = token || await getFreshAuthToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/metaapi-open-positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ account_id: accountId }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateDateChunks(startDate: Date, endDate: Date, chunkMonths: number = 3) {
  const chunks: { start: Date; end: Date }[] = [];
  let currentStart = new Date(startDate);
  while (currentStart < endDate) {
    const currentEnd = new Date(currentStart);
    currentEnd.setMonth(currentEnd.getMonth() + chunkMonths);
    if (currentEnd > endDate) currentEnd.setTime(endDate.getTime());
    chunks.push({ start: new Date(currentStart), end: new Date(currentEnd) });
    currentStart = new Date(currentEnd);
    currentStart.setSeconds(currentStart.getSeconds() + 1);
  }
  return chunks;
}

function formatDateRange(start: Date, end: Date) {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

async function getLastSyncedDate(accountId: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from('mt_connections')
    .select('last_synced_date')
    .eq('account_id', accountId)
    .single();
  if (error) return null;
  return data?.last_synced_date ? new Date(data.last_synced_date) : null;
}

async function updateLastSyncedDate(accountId: string): Promise<void> {
  await supabase
    .from('mt_connections')
    .update({ last_synced_date: new Date().toISOString() })
    .eq('account_id', accountId);
}

/**
 * Full historical data sync with incremental support
 */
export async function syncHistoricalData(
  accountId: string,
  startTime?: string,
  endTime?: string,
  onProgress?: (p: SyncProgressUpdate) => void
): Promise<ApiResponse> {
  try {
    const cooldown = checkSyncCooldown(accountId);
    if (cooldown.isActive) {
      return { success: false, error: `Please wait ${cooldown.remainingMinutes} minute(s) before syncing again` };
    }

    const endDate = endTime ? new Date(endTime) : new Date();
    const lastSynced = await getLastSyncedDate(accountId);
    const startDate = startTime
      ? new Date(startTime)
      : lastSynced ?? new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());

    const chunks = generateDateChunks(startDate, endDate, 3);
    let totalTradesSynced = 0;
    const failedChunks: { chunk: number; error: string; dateRange: string }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const dateRange = formatDateRange(chunk.start, chunk.end);

      onProgress?.({
        stage: `Syncing ${dateRange}...`,
        percentage: Math.floor((i / chunks.length) * 90),
        currentChunk: i + 1,
        totalChunks: chunks.length,
        dateRange,
      });

      try {
        const token = await getFreshAuthToken();
        const historyRes = await fetchHistoricalData(
          accountId,
          chunk.start.toISOString(),
          chunk.end.toISOString(),
          token
        );

        if (!historyRes.success || !historyRes.data) {
          failedChunks.push({ chunk: i + 1, error: historyRes.error || 'Unknown', dateRange });
          continue;
        }

        if (historyRes.data.trades.length > 0) {
          const storeToken = await getFreshAuthToken();
          const storeRes = await fetch(`${SUPABASE_URL}/functions/v1/metaapi-store-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storeToken}` },
            body: JSON.stringify({
              account_id: accountId,
              trades: historyRes.data.trades,
              metrics: historyRes.data.metrics,
              positions: historyRes.data.positions,
            }),
          });
          const storeData = await storeRes.json();
          if (!storeRes.ok) {
            failedChunks.push({ chunk: i + 1, error: storeData.error || 'Failed to store', dateRange });
          } else {
            totalTradesSynced += historyRes.data.trades.length;
          }
        }

        if (i < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (error) {
        failedChunks.push({
          chunk: i + 1,
          error: error instanceof Error ? error.message : 'Unknown',
          dateRange,
        });
      }
    }

    onProgress?.({ stage: 'Finalizing...', percentage: 95 });

    const token = await getFreshAuthToken();
    await fetchAccountMetrics(accountId, token);
    await fetchOpenPositions(accountId, token);
    await updateLastSyncedDate(accountId);
    updateLastSyncTime(accountId);

    onProgress?.({ stage: 'Sync completed!', percentage: 100 });

    return {
      success: true,
      message: `Synced ${totalTradesSynced} trades${failedChunks.length ? ` (${failedChunks.length} chunks failed)` : ''}`,
      data: {
        tradesCount: totalTradesSynced,
        totalChunks: chunks.length,
        failedChunks: failedChunks.length,
        failedChunkDetails: failedChunks.length ? failedChunks : undefined,
        syncType: lastSynced ? 'incremental' : 'initial',
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Sync failed' };
  }
}