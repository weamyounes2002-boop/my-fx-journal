// MT4/MT5 API Helper Functions
// Handles encryption, validation, and database operations for MT connections

import { supabase } from './supabase';

// Encryption helper using Web Crypto API
export class PasswordEncryption {
  private static ALGORITHM = 'AES-GCM';
  private static KEY_LENGTH = 256;
  
  /**
   * Generate a cryptographic key from a password
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Encrypt investor password using AES-256-GCM
   */
  static async encrypt(plaintext: string, userKey: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const key = await this.deriveKey(userKey, salt);
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encoder.encode(plaintext)
      );
      
      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);
      
      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt password');
    }
  }
  
  /**
   * Decrypt investor password
   */
  static async decrypt(encryptedData: string, userKey: string): Promise<string> {
    try {
      // Decode from base64
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encrypted = combined.slice(28);
      
      const key = await this.deriveKey(userKey, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt password');
    }
  }
}

interface MTConnectionData {
  platform_type?: string;
  login_number?: string;
  broker_server?: string;
  investor_password?: string;
  account_id?: string;
}

interface TradeRequestData {
  connection_id?: string;
  trades?: unknown;
  account_info?: unknown;
}

// Validation helpers
export const validateMTConnection = (data: MTConnectionData): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.platform_type || !['MT4', 'MT5'].includes(data.platform_type)) {
    errors.push('Platform type must be MT4 or MT5');
  }
  
  if (!data.login_number || typeof data.login_number !== 'string') {
    errors.push('Login number is required');
  }
  
  if (!data.broker_server || typeof data.broker_server !== 'string') {
    errors.push('Broker server is required');
  }
  
  if (!data.investor_password || typeof data.investor_password !== 'string') {
    errors.push('Investor password is required');
  }
  
  if (!data.account_id || typeof data.account_id !== 'string') {
    errors.push('Account ID is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateTradeData = (data: TradeRequestData): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.connection_id || typeof data.connection_id !== 'string') {
    errors.push('Connection ID is required');
  }
  
  if (!data.trades || !Array.isArray(data.trades)) {
    errors.push('Trades array is required');
  }
  
  if (data.account_info && typeof data.account_info !== 'object') {
    errors.push('Account info must be an object');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Rate limiting helper (simple in-memory implementation)
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Filter out old requests outside the time window
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter(20, 60000); // 20 requests per minute

// API Response helpers
export const createSuccessResponse = <T>(data: T, message?: string) => ({
  success: true,
  data,
  message: message || 'Operation successful',
  timestamp: new Date().toISOString()
});

export const createErrorResponse = (error: string, statusCode: number = 400, details?: string | Record<string, unknown>) => ({
  success: false,
  error,
  statusCode,
  details,
  timestamp: new Date().toISOString()
});

// Database operation helpers
export const createMTConnection = async (
  userId: string,
  connectionData: {
    account_id: string;
    platform_type: string;
    login_number: string;
    broker_server: string;
    investor_password_encrypted: string;
    account_currency?: string;
    account_leverage?: string;
    account_company?: string;
    connection_method?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('mt_connections')
      .insert([{
        user_id: userId,
        ...connectionData,
        connection_status: 'pending',
        account_balance: 0,
        account_equity: 0,
        account_margin: 0,
        account_free_margin: 0,
        account_margin_level: 0
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating MT connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: errorMessage };
  }
};

export const updateMTConnection = async (
  connectionId: string,
  userId: string,
  updates: {
    connection_status?: string;
    account_balance?: number;
    account_equity?: number;
    account_margin?: number;
    account_free_margin?: number;
    account_margin_level?: number;
    last_sync_time?: string;
    last_error_message?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('mt_connections')
      .update(updates)
      .eq('id', connectionId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating MT connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: errorMessage };
  }
};

export const getMTConnection = async (connectionId: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('mt_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching MT connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: errorMessage };
  }
};

export const deleteMTConnection = async (connectionId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('mt_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting MT connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: errorMessage };
  }
};

export const createSyncLog = async (
  connectionId: string,
  logData: {
    sync_status: string;
    sync_type?: string;
    trades_synced?: number;
    trades_updated?: number;
    trades_failed?: number;
    positions_synced?: number;
    orders_synced?: number;
    error_message?: string;
    error_code?: string;
    sync_duration_ms?: number;
    data_size_kb?: number;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('mt_sync_logs')
      .insert([{
        connection_id: connectionId,
        ...logData
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating sync log:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: errorMessage };
  }
};

interface TradeData {
  ticket: string;
  symbol: string;
  lots: number;
  open_price: number;
  close_price?: number;
  open_time: string;
  close_time?: string;
  profit?: number;
  stop_loss?: number;
  take_profit?: number;
}

export const syncTradesToDatabase = async (
  userId: string,
  accountId: string,
  trades: TradeData[]
) => {
  try {
    const tradesToInsert = trades.map(trade => ({
      user_id: userId,
      account_id: accountId,
      symbol: trade.symbol,
      entry_price: trade.open_price,
      exit_price: trade.close_price || null,
      position_size: trade.lots,
      entry_date: trade.open_time,
      exit_date: trade.close_time || null,
      profit_loss: trade.profit || 0,
      status: trade.close_time ? 'closed' : 'open',
      stop_loss: trade.stop_loss || null,
      take_profit: trade.take_profit || null,
      notes: `MT Import - Ticket: ${trade.ticket}`
    }));
    
    const { data, error } = await supabase
      .from('trades')
      .upsert(tradesToInsert, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) throw error;
    return { data, error: null, count: data?.length || 0 };
  } catch (error) {
    console.error('Error syncing trades:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: errorMessage, count: 0 };
  }
};