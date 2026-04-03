// MT4/MT5 API Client
// These functions call the Express backend server
import { supabase } from '@/lib/supabase';
import {
  PasswordEncryption,
  validateMTConnection,
  validateTradeData,
  rateLimiter,
  createSuccessResponse,
  createErrorResponse,
  createMTConnection,
  updateMTConnection,
  getMTConnection,
  deleteMTConnection,
  createSyncLog,
  syncTradesToDatabase
} from '@/lib/mtApiHelpers';

// Import MetaAPI client functions
import {
  connectMetaApiAccount as connectMetaApiAccountClient,
  syncMetaApiTrades as syncMetaApiTradesClient,
  disconnectMetaApiAccount as disconnectMetaApiAccountClient,
  getConnectionStatus as checkConnectionStatus
} from '@/api/metaApiClient';

/**
 * Connect MT4/MT5 account via MetaAPI cloud bridge
 */
export const connectMetaApiAccount = async (requestData: {
  platform_type: 'mt4' | 'mt5';
  login_number: string;
  broker_server: string;
  investor_password: string;
  account_id: string;
  broker_name: string;
}) => {
  return connectMetaApiAccountClient(requestData);
};

/**
 * Manually trigger sync for MetaAPI connection
 */
export const syncMetaApiAccount = async (connectionId: string) => {
  return syncMetaApiTradesClient(connectionId);
};

/**
 * Get MetaAPI connection status
 */
export const getMetaApiConnectionStatus = async (connectionId: string) => {
  return checkConnectionStatus(connectionId);
};

/**
 * Disconnect MetaAPI account
 */
export const disconnectMTAccount = async (connectionId: string) => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createErrorResponse('Unauthorized: Please log in', 401);
    }
    
    if (!connectionId) {
      return createErrorResponse('Connection ID is required', 400);
    }
    
    // Verify connection exists and belongs to user
    const { data: connection, error: connError } = await getMTConnection(connectionId, user.id);
    
    if (connError || !connection) {
      return createErrorResponse('Connection not found', 404);
    }
    
    // If MetaAPI connection, use the disconnect API
    if (connection.connection_method === 'metaapi') {
      return disconnectMetaApiAccountClient(connectionId);
    }
    
    // Delete connection (this will cascade delete sync logs)
    const { error: deleteError } = await deleteMTConnection(connectionId, user.id);
    
    if (deleteError) {
      return createErrorResponse('Failed to disconnect account', 500, deleteError);
    }
    
    return createSuccessResponse(
      { connection_id: connectionId },
      'MT account disconnected successfully'
    );
  } catch (error) {
    console.error('Disconnect MT account error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse('Internal server error', 500, errorMessage);
  }
};

/**
 * POST /api/mt/connect
 * Validate and store MT4/MT5 connection (EA method)
 */
export const connectMTAccount = async (requestData: {
  platform_type: string;
  login_number: string;
  broker_server: string;
  investor_password: string;
  account_id: string;
  account_currency?: string;
  account_leverage?: string;
  account_company?: string;
}) => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createErrorResponse('Unauthorized: Please log in', 401);
    }
    
    // Rate limiting
    if (!rateLimiter.isAllowed(user.id)) {
      return createErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }
    
    // Validate input
    const validation = validateMTConnection(requestData);
    if (!validation.valid) {
      return createErrorResponse('Validation failed', 400, validation.errors);
    }
    
    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('mt_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('login_number', requestData.login_number)
      .eq('broker_server', requestData.broker_server)
      .single();
    
    if (existingConnection) {
      return createErrorResponse('Connection already exists for this account', 409);
    }
    
    // Encrypt investor password using user ID as encryption key
    const encryptedPassword = await PasswordEncryption.encrypt(
      requestData.investor_password,
      user.id
    );
    
    // Create MT connection
    const { data: connection, error: createError } = await createMTConnection(user.id, {
      account_id: requestData.account_id,
      platform_type: requestData.platform_type,
      login_number: requestData.login_number,
      broker_server: requestData.broker_server,
      investor_password_encrypted: encryptedPassword,
      account_currency: requestData.account_currency || 'USD',
      account_leverage: requestData.account_leverage,
      account_company: requestData.account_company,
      connection_method: 'ea'
    });
    
    if (createError) {
      return createErrorResponse('Failed to create connection', 500, createError);
    }
    
    // Create initial sync log
    await createSyncLog(connection.id, {
      sync_status: 'success',
      sync_type: 'initial',
      trades_synced: 0,
      sync_duration_ms: 0
    });
    
    return createSuccessResponse(
      {
        connection_id: connection.id,
        platform_type: connection.platform_type,
        login_number: connection.login_number,
        broker_server: connection.broker_server,
        connection_status: connection.connection_status,
        connection_method: 'ea'
      },
      'MT account connected successfully'
    );
  } catch (error) {
    console.error('Connect MT account error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse('Internal server error', 500, errorMessage);
  }
};

interface TradeData {
  ticket: string;
  symbol: string;
  type: string;
  lots: number;
  open_price: number;
  close_price?: number;
  open_time: string;
  close_time?: string;
  profit?: number;
  commission?: number;
  swap?: number;
  stop_loss?: number;
  take_profit?: number;
  comment?: string;
}

/**
 * POST /api/mt/sync-trades
 * Receive trade data from Expert Advisor
 */
export const syncMTTrades = async (requestData: {
  connection_id: string;
  trades: TradeData[];
  account_info?: {
    balance: number;
    equity: number;
    margin: number;
    free_margin: number;
    margin_level: number;
  };
}) => {
  const startTime = Date.now();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createErrorResponse('Unauthorized: Please log in', 401);
    }
    
    // Rate limiting
    if (!rateLimiter.isAllowed(`${user.id}-sync`)) {
      return createErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }
    
    // Validate input
    const validation = validateTradeData(requestData);
    if (!validation.valid) {
      return createErrorResponse('Validation failed', 400, validation.errors);
    }
    
    // Verify connection belongs to user
    const { data: connection, error: connError } = await getMTConnection(
      requestData.connection_id,
      user.id
    );
    
    if (connError || !connection) {
      return createErrorResponse('Connection not found', 404);
    }
    
    // Update account info if provided
    if (requestData.account_info) {
      await updateMTConnection(requestData.connection_id, user.id, {
        account_balance: requestData.account_info.balance,
        account_equity: requestData.account_info.equity,
        account_margin: requestData.account_info.margin,
        account_free_margin: requestData.account_info.free_margin,
        account_margin_level: requestData.account_info.margin_level,
        last_sync_time: new Date().toISOString(),
        connection_status: 'connected'
      });
    }
    
    // Sync trades to database
    const { error: syncError, count } = await syncTradesToDatabase(
      user.id,
      connection.account_id,
      requestData.trades
    );
    
    const syncDuration = Date.now() - startTime;
    
    // Create sync log
    await createSyncLog(requestData.connection_id, {
      sync_status: syncError ? 'failed' : 'success',
      sync_type: 'full',
      trades_synced: count,
      trades_updated: count,
      trades_failed: syncError ? requestData.trades.length : 0,
      error_message: syncError || undefined,
      sync_duration_ms: syncDuration,
      data_size_kb: Math.round(JSON.stringify(requestData.trades).length / 1024)
    });
    
    if (syncError) {
      return createErrorResponse('Failed to sync trades', 500, syncError);
    }
    
    return createSuccessResponse(
      {
        trades_synced: count,
        sync_duration_ms: syncDuration,
        connection_status: 'connected'
      },
      `Successfully synced ${count} trades`
    );
  } catch (error) {
    console.error('Sync trades error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log failed sync
    if (requestData.connection_id) {
      await createSyncLog(requestData.connection_id, {
        sync_status: 'failed',
        sync_type: 'full',
        error_message: errorMessage,
        sync_duration_ms: Date.now() - startTime
      });
    }
    
    return createErrorResponse('Internal server error', 500, errorMessage);
  }
};

/**
 * GET /api/mt/status
 * Check connection status for a user's MT account
 */
export const getMTStatus = async (connectionId: string) => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createErrorResponse('Unauthorized: Please log in', 401);
    }
    
    if (!connectionId) {
      return createErrorResponse('Connection ID is required', 400);
    }
    
    // Get connection
    const { data: connection, error: connError } = await getMTConnection(connectionId, user.id);
    
    if (connError || !connection) {
      return createErrorResponse('Connection not found', 404);
    }
    
    // Get recent sync logs
    const { data: recentLogs } = await supabase
      .from('mt_sync_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('synced_at', { ascending: false })
      .limit(5);
    
    return createSuccessResponse({
      connection_id: connection.id,
      platform_type: connection.platform_type,
      login_number: connection.login_number,
      broker_server: connection.broker_server,
      connection_status: connection.connection_status,
      connection_method: connection.connection_method || 'ea',
      last_sync_time: connection.last_sync_time,
      account_balance: connection.account_balance,
      account_equity: connection.account_equity,
      account_margin: connection.account_margin,
      metaapi_account_id: connection.metaapi_account_id,
      recent_syncs: recentLogs || []
    });
  } catch (error) {
    console.error('Get MT status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse('Internal server error', 500, errorMessage);
  }
};

/**
 * GET /api/mt/connections
 * Get all MT connections for the current user
 */
export const getMTConnections = async () => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createErrorResponse('Unauthorized: Please log in', 401);
    }
    
    // Get all connections for user
    const { data: connections, error } = await supabase
      .from('mt_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return createErrorResponse('Failed to fetch connections', 500, error.message);
    }
    
    return createSuccessResponse({
      connections: connections || [],
      total: connections?.length || 0
    });
  } catch (error) {
    console.error('Get MT connections error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse('Internal server error', 500, errorMessage);
  }
};