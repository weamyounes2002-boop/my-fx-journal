// MT4/MT5 Trade Synchronization Helper Functions
// Maps MetaTrader trade data to Trade Journal format

import { supabase } from './supabase';

/**
 * Trade interface matching the database schema
 */
export interface Trade {
  id?: string;
  user_id: string;
  account_id: string;
  symbol: string;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  entry_date: string;
  exit_date: string | null;
  profit_loss: number;
  strategy?: string | null;
  notes?: string | null;
  status: 'open' | 'closed';
  stop_loss?: number | null;
  take_profit?: number | null;
  exit_type?: 'stop_loss' | 'take_profit' | 'manual' | 'trailing_stop' | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * MT4 Trade structure from Expert Advisor
 */
export interface MT4Trade {
  ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  lots: number;
  open_price: number;
  close_price?: number | null;
  open_time: string;
  close_time?: string | null;
  profit: number;
  commission: number;
  swap: number;
  stop_loss?: number;
  take_profit?: number;
}

/**
 * MT5 Trade structure from Expert Advisor
 */
export interface MT5Trade {
  ticket: number;
  position_id?: number;
  symbol: string;
  type: 'buy' | 'sell';
  lots: number;
  open_price: number;
  close_price?: number | null;
  open_time: string;
  close_time?: string | null;
  profit: number;
  commission: number;
  swap: number;
  stop_loss?: number;
  take_profit?: number;
}

/**
 * Sync statistics result
 */
export interface SyncResult {
  inserted: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * Convert MT4 trade structure to Trade interface
 */
export function convertMT4TradeToJournal(
  mtTrade: MT4Trade,
  userId: string,
  accountId: string
): Trade {
  const netProfitLoss = calculateProfitLoss({
    profit: mtTrade.profit,
    commission: mtTrade.commission,
    swap: mtTrade.swap
  });

  const normalizedSymbol = normalizeSymbol(mtTrade.symbol);
  const status: 'open' | 'closed' = mtTrade.close_time ? 'closed' : 'open';

  return {
    user_id: userId,
    account_id: accountId,
    symbol: normalizedSymbol,
    entry_price: mtTrade.open_price,
    exit_price: mtTrade.close_price || null,
    position_size: mtTrade.lots,
    entry_date: convertMTTimeToISO(mtTrade.open_time),
    exit_date: mtTrade.close_time ? convertMTTimeToISO(mtTrade.close_time) : null,
    profit_loss: netProfitLoss,
    status: status,
    stop_loss: mtTrade.stop_loss || null,
    take_profit: mtTrade.take_profit || null,
    exit_type: determineExitType(mtTrade),
    notes: `MT4 Import - Ticket: ${mtTrade.ticket}`
  };
}

/**
 * Convert MT5 trade structure to Trade interface
 */
export function convertMT5TradeToJournal(
  mtTrade: MT5Trade,
  userId: string,
  accountId: string
): Trade {
  const netProfitLoss = calculateProfitLoss({
    profit: mtTrade.profit,
    commission: mtTrade.commission,
    swap: mtTrade.swap
  });

  const normalizedSymbol = normalizeSymbol(mtTrade.symbol);
  const status: 'open' | 'closed' = mtTrade.close_time ? 'closed' : 'open';

  return {
    user_id: userId,
    account_id: accountId,
    symbol: normalizedSymbol,
    entry_price: mtTrade.open_price,
    exit_price: mtTrade.close_price || null,
    position_size: mtTrade.lots,
    entry_date: convertMTTimeToISO(mtTrade.open_time),
    exit_date: mtTrade.close_time ? convertMTTimeToISO(mtTrade.close_time) : null,
    profit_loss: netProfitLoss,
    status: status,
    stop_loss: mtTrade.stop_loss || null,
    take_profit: mtTrade.take_profit || null,
    exit_type: determineExitType(mtTrade),
    notes: `MT5 Import - Ticket: ${mtTrade.ticket}${mtTrade.position_id ? ` - Position: ${mtTrade.position_id}` : ''}`
  };
}

/**
 * Map MT4/MT5 order types to 'buy'/'sell'
 * MT4: 0=buy, 1=sell, 2=buy limit, 3=sell limit, 4=buy stop, 5=sell stop
 * MT5: Uses string types from EA
 */
export function mapOrderType(mtOrderType: number | string, platform: 'MT4' | 'MT5'): 'buy' | 'sell' {
  if (platform === 'MT4') {
    // MT4 uses numeric types
    if (typeof mtOrderType === 'number') {
      return mtOrderType === 0 || mtOrderType === 2 || mtOrderType === 4 ? 'buy' : 'sell';
    }
  }
  
  // MT5 or string type
  const typeStr = String(mtOrderType).toLowerCase();
  return typeStr.includes('buy') ? 'buy' : 'sell';
}

/**
 * Calculate accurate profit/loss including commission and swap
 */
export function calculateProfitLoss(trade: {
  profit: number;
  commission: number;
  swap: number;
}): number {
  const netPL = trade.profit + trade.commission + trade.swap;
  return Math.round(netPL * 100) / 100; // Round to 2 decimal places
}

/**
 * Normalize broker-specific symbols to standard format
 * Examples:
 * - "EURUSDm" -> "EURUSD"
 * - "EURUSD.a" -> "EURUSD"
 * - "EURUSD_i" -> "EURUSD"
 * - "#USOIL" -> "USOIL"
 */
export function normalizeSymbol(mtSymbol: string): string {
  if (!mtSymbol) return '';
  
  let normalized = mtSymbol.trim().toUpperCase();
  
  // Remove common broker suffixes
  normalized = normalized.replace(/[._-][A-Z]+$/i, ''); // Remove .suffix, _suffix, -suffix
  normalized = normalized.replace(/[MmIiAaBbCc]$/, ''); // Remove single letter suffixes
  normalized = normalized.replace(/^#/, ''); // Remove # prefix for commodities
  normalized = normalized.replace(/\s+/g, ''); // Remove spaces
  
  return normalized;
}

interface ExistingTrade {
  id: string;
  notes: string | null;
  exit_date: string | null;
  profit_loss: number;
  status: string;
}

/**
 * Check if trade already exists in database by ticket number
 */
export async function checkDuplicateTrade(
  ticket: number,
  userId: string
): Promise<{ exists: boolean; tradeId?: string; trade?: ExistingTrade }> {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('id, notes, exit_date, profit_loss, status')
      .eq('user_id', userId)
      .ilike('notes', `%Ticket: ${ticket}%`)
      .limit(1);

    if (error) {
      console.error('Error checking duplicate trade:', error);
      return { exists: false };
    }

    if (data && data.length > 0) {
      return {
        exists: true,
        tradeId: data[0].id,
        trade: data[0] as ExistingTrade
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Unexpected error checking duplicate:', error);
    return { exists: false };
  }
}

/**
 * Sync single trade to database (insert or update)
 */
export async function syncTradeToDatabase(
  trade: Trade,
  connectionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; action?: 'inserted' | 'updated' }> {
  try {
    // Extract ticket number from notes
    const ticketMatch = trade.notes?.match(/Ticket: (\d+)/);
    if (!ticketMatch) {
      return { success: false, error: 'Invalid trade: missing ticket number' };
    }

    const ticket = parseInt(ticketMatch[1]);

    // Check if trade already exists
    const duplicate = await checkDuplicateTrade(ticket, userId);

    if (duplicate.exists && duplicate.tradeId) {
      // Trade exists - check if it needs updating
      const existingTrade = duplicate.trade;
      
      if (!existingTrade) {
        return { success: false, error: 'Existing trade data not found' };
      }

      // Update if trade is now closed or profit changed
      const needsUpdate = 
        (trade.status === 'closed' && existingTrade.status === 'open') ||
        (trade.exit_date && !existingTrade.exit_date) ||
        (Math.abs(trade.profit_loss - existingTrade.profit_loss) > 0.01);

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('trades')
          .update({
            exit_price: trade.exit_price,
            exit_date: trade.exit_date,
            profit_loss: trade.profit_loss,
            status: trade.status,
            exit_type: trade.exit_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', duplicate.tradeId)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating trade:', updateError);
          return { success: false, error: updateError.message };
        }

        return { success: true, action: 'updated' };
      }

      // No update needed
      return { success: true, action: 'updated' }; // Count as updated but no actual change
    }

    // Trade doesn't exist - insert new
    const { error: insertError } = await supabase
      .from('trades')
      .insert([trade]);

    if (insertError) {
      console.error('Error inserting trade:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, action: 'inserted' };
  } catch (error) {
    console.error('Unexpected error syncing trade:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Process multiple MT trades efficiently in batch
 */
export async function processMTTradesBatch(
  trades: (MT4Trade | MT5Trade)[],
  connectionId: string,
  userId: string,
  accountId: string,
  platform: 'MT4' | 'MT5'
): Promise<SyncResult> {
  const result: SyncResult = {
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  if (!trades || trades.length === 0) {
    return result;
  }

  // Process trades sequentially to avoid conflicts
  for (const mtTrade of trades) {
    try {
      // Validate trade data
      if (!mtTrade.ticket || !mtTrade.symbol || !mtTrade.open_price) {
        result.failed++;
        result.errors.push(`Invalid trade data: missing required fields (ticket: ${mtTrade.ticket})`);
        continue;
      }

      // Convert to journal format
      const journalTrade = platform === 'MT4'
        ? convertMT4TradeToJournal(mtTrade as MT4Trade, userId, accountId)
        : convertMT5TradeToJournal(mtTrade as MT5Trade, userId, accountId);

      // Sync to database
      const syncResult = await syncTradeToDatabase(journalTrade, connectionId, userId);

      if (syncResult.success) {
        if (syncResult.action === 'inserted') {
          result.inserted++;
        } else if (syncResult.action === 'updated') {
          result.updated++;
        }
      } else {
        result.failed++;
        result.errors.push(`Ticket ${mtTrade.ticket}: ${syncResult.error}`);
      }
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Ticket ${mtTrade.ticket}: ${errorMessage}`);
    }
  }

  return result;
}

/**
 * Determine exit type based on trade data
 */
function determineExitType(
  trade: MT4Trade | MT5Trade
): 'stop_loss' | 'take_profit' | 'manual' | 'trailing_stop' | null {
  if (!trade.close_price || !trade.close_time) {
    return null; // Trade still open
  }

  const closePrice = trade.close_price;
  const stopLoss = trade.stop_loss || 0;
  const takeProfit = trade.take_profit || 0;

  // Check if closed at stop loss (within 5 pips tolerance)
  if (stopLoss > 0) {
    const slDiff = Math.abs(closePrice - stopLoss);
    if (slDiff < 0.0005) { // 5 pips for forex
      return 'stop_loss';
    }
  }

  // Check if closed at take profit (within 5 pips tolerance)
  if (takeProfit > 0) {
    const tpDiff = Math.abs(closePrice - takeProfit);
    if (tpDiff < 0.0005) { // 5 pips for forex
      return 'take_profit';
    }
  }

  // Default to manual close
  return 'manual';
}

/**
 * Convert MT time format to ISO string
 * MT sends: "2024-01-15 10:30:00"
 * Need: "2024-01-15T10:30:00.000Z"
 */
function convertMTTimeToISO(mtTime: string): string {
  if (!mtTime) return new Date().toISOString();

  try {
    // MT time format: "YYYY-MM-DD HH:MM:SS"
    const cleanTime = mtTime.trim().replace(' ', 'T');
    
    // Check if already has timezone
    if (cleanTime.includes('Z') || cleanTime.includes('+') || cleanTime.includes('-')) {
      return new Date(cleanTime).toISOString();
    }

    // Assume UTC if no timezone specified
    const date = new Date(cleanTime + 'Z');
    
    if (isNaN(date.getTime())) {
      console.error('Invalid MT time format:', mtTime);
      return new Date().toISOString();
    }

    return date.toISOString();
  } catch (error) {
    console.error('Error converting MT time:', error);
    return new Date().toISOString();
  }
}

/**
 * Validate trade data before processing
 */
export function validateTradeData(trade: MT4Trade | MT5Trade): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!trade.ticket || trade.ticket <= 0) {
    errors.push('Invalid ticket number');
  }

  if (!trade.symbol || trade.symbol.trim().length === 0) {
    errors.push('Missing symbol');
  }

  if (!trade.open_price || trade.open_price <= 0) {
    errors.push('Invalid open price');
  }

  if (!trade.lots || trade.lots <= 0) {
    errors.push('Invalid lot size');
  }

  if (!trade.open_time) {
    errors.push('Missing open time');
  }

  if (!trade.type || !['buy', 'sell'].includes(trade.type)) {
    errors.push('Invalid trade type');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get sync statistics for a connection
 */
export async function getSyncStatistics(
  connectionId: string,
  userId: string
): Promise<{
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalProfit: number;
  lastSyncTime: string | null;
}> {
  try {
    // Get connection info
    const { data: connection } = await supabase
      .from('mt_connections')
      .select('account_id, last_sync_time')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (!connection) {
      return {
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalProfit: 0,
        lastSyncTime: null
      };
    }

    // Get trade statistics
    const { data: trades } = await supabase
      .from('trades')
      .select('status, profit_loss')
      .eq('user_id', userId)
      .eq('account_id', connection.account_id)
      .ilike('notes', '%MT%Import%');

    if (!trades) {
      return {
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalProfit: 0,
        lastSyncTime: connection.last_sync_time
      };
    }

    const openTrades = trades.filter(t => t.status === 'open').length;
    const closedTrades = trades.filter(t => t.status === 'closed').length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);

    return {
      totalTrades: trades.length,
      openTrades,
      closedTrades,
      totalProfit: Math.round(totalProfit * 100) / 100,
      lastSyncTime: connection.last_sync_time
    };
  } catch (error) {
    console.error('Error getting sync statistics:', error);
    return {
      totalTrades: 0,
      openTrades: 0,
      closedTrades: 0,
      totalProfit: 0,
      lastSyncTime: null
    };
  }
}