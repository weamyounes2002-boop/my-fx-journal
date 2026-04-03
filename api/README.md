# MT4/MT5 API Documentation

This directory contains the API endpoints for MetaTrader 4 and MetaTrader 5 integration.

## Overview

The MT API allows users to connect their MetaTrader accounts and automatically sync trade data to the web application. The API uses Supabase for database operations and implements security features like encryption, rate limiting, and authentication.

## API Endpoints

### 1. Connect MT Account
**Function:** `connectMTAccount(requestData)`

**Description:** Validates and stores MT4/MT5 connection credentials.

**Request Data:**
```typescript
{
  platform_type: string;      // 'MT4' or 'MT5'
  login_number: string;       // MT account login number
  broker_server: string;      // Broker server name (e.g., 'ICMarkets-Demo01')
  investor_password: string;  // Investor (read-only) password
  account_id: string;         // Associated account ID from accounts table
  account_currency?: string;  // Optional, defaults to 'USD'
  account_leverage?: string;  // Optional (e.g., '1:500')
  account_company?: string;   // Optional broker company name
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    connection_id: string;
    platform_type: string;
    login_number: string;
    broker_server: string;
    connection_status: string;
  };
  message: string;
  timestamp: string;
}
```

**Security:**
- Encrypts investor password using AES-256-GCM before storage
- Validates user authentication
- Checks for duplicate connections
- Rate limited to 20 requests per minute per user

---

### 2. Sync Trades
**Function:** `syncMTTrades(requestData)`

**Description:** Receives trade data from Expert Advisor and syncs to database.

**Request Data:**
```typescript
{
  connection_id: string;
  trades: Array<{
    ticket: number;
    symbol: string;
    open_price: number;
    close_price?: number;
    lots: number;
    open_time: string;
    close_time?: string;
    profit?: number;
    stop_loss?: number;
    take_profit?: number;
  }>;
  account_info?: {
    balance: number;
    equity: number;
    margin: number;
    free_margin: number;
    margin_level: number;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    trades_synced: number;
    sync_duration_ms: number;
    connection_status: string;
  };
  message: string;
  timestamp: string;
}
```

**Features:**
- Updates account balance, equity, and margin
- Syncs trade history to trades table
- Creates sync log entry
- Handles partial sync failures
- Rate limited to 20 requests per minute per user

---

### 3. Get Connection Status
**Function:** `getMTStatus(connectionId)`

**Description:** Checks connection status and recent sync history.

**Parameters:**
- `connectionId` (string): The MT connection ID

**Response:**
```typescript
{
  success: boolean;
  data: {
    connection_id: string;
    platform_type: string;
    login_number: string;
    broker_server: string;
    connection_status: string;
    last_sync_time: string;
    account_balance: number;
    account_equity: number;
    account_margin: number;
    recent_syncs: Array<SyncLog>;
  };
  message: string;
  timestamp: string;
}
```

---

### 4. Disconnect MT Account
**Function:** `disconnectMTAccount(connectionId)`

**Description:** Removes/deactivates MT connection.

**Parameters:**
- `connectionId` (string): The MT connection ID

**Response:**
```typescript
{
  success: boolean;
  data: {
    connection_id: string;
  };
  message: string;
  timestamp: string;
}
```

**Notes:**
- Deletes connection from database
- Cascades to delete all sync logs
- Does not delete synced trades

---

### 5. Get All Connections
**Function:** `getMTConnections()`

**Description:** Retrieves all MT connections for the current user.

**Response:**
```typescript
{
  success: boolean;
  data: {
    connections: Array<MTConnection>;
    total: number;
  };
  message: string;
  timestamp: string;
}
```

---

## Security Features

### 1. Authentication
- All endpoints require valid Supabase authentication
- User ID is verified for all database operations
- Row Level Security (RLS) policies enforce data isolation

### 2. Encryption
- Investor passwords encrypted using AES-256-GCM
- User ID used as encryption key derivation input
- PBKDF2 with 100,000 iterations for key derivation
- Random salt and IV for each encryption

### 3. Rate Limiting
- 20 requests per minute per user
- Separate limits for sync operations
- In-memory implementation (consider Redis for production)

### 4. Input Validation
- Platform type must be 'MT4' or 'MT5'
- Required fields validated before processing
- Trade data structure validated
- Prevents duplicate connections

### 5. Error Handling
- Graceful error responses with proper HTTP status codes
- Detailed error messages for debugging
- Error logging to sync_logs table
- No sensitive data in error responses

---

## Usage Example

### In React Component:
```typescript
import { connectMTAccount, syncMTTrades, getMTStatus } from '@/api/mtApi';

// Connect MT account
const handleConnect = async () => {
  const result = await connectMTAccount({
    platform_type: 'MT5',
    login_number: '12345678',
    broker_server: 'ICMarkets-Demo01',
    investor_password: 'readonly_password',
    account_id: 'uuid-of-account',
    account_currency: 'USD',
    account_leverage: '1:500'
  });
  
  if (result.success) {
    console.log('Connected:', result.data);
  } else {
    console.error('Error:', result.error);
  }
};

// Sync trades
const handleSync = async (connectionId: string) => {
  const result = await syncMTTrades({
    connection_id: connectionId,
    trades: [
      {
        ticket: 123456,
        symbol: 'EURUSD',
        open_price: 1.1234,
        close_price: 1.1250,
        lots: 0.1,
        open_time: '2024-01-01T10:00:00Z',
        close_time: '2024-01-01T12:00:00Z',
        profit: 16.00
      }
    ],
    account_info: {
      balance: 10000,
      equity: 10016,
      margin: 100,
      free_margin: 9916,
      margin_level: 10016
    }
  });
  
  if (result.success) {
    console.log('Synced:', result.data);
  }
};
```

---

## Database Schema Reference

The API uses the following tables from `supabase-mt-integration-schema.sql`:

- `mt_connections` - Stores connection credentials and status
- `mt_sync_logs` - Tracks synchronization history
- `mt_bridge_status` - Monitors bridge service health

See the schema file for complete table structures and RLS policies.

---

## Best Practices

1. **Always use investor (read-only) passwords**, never master passwords
2. **Encrypt passwords client-side** before sending to API
3. **Implement proper error handling** in your UI
4. **Show sync status** to users with real-time updates
5. **Log all sync operations** for debugging and audit
6. **Test with demo accounts** before using live accounts
7. **Implement retry logic** for failed sync operations
8. **Monitor rate limits** and adjust as needed

---

## Future Enhancements

- WebSocket support for real-time trade updates
- Batch sync optimization for large trade histories
- Advanced error recovery mechanisms
- Multi-device sync coordination
- Trade conflict resolution
- Performance metrics dashboard