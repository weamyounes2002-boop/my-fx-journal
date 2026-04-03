# MetaAPI Cloud Bridge Integration

This document explains the MetaAPI integration implementation for MT4/MT5 account connections in the My FX Journal application.

## Overview

The MetaAPI Cloud Bridge integration allows users to connect their MT4/MT5 trading accounts instantly without installing any software. The system uses MetaAPI's cloud infrastructure to:

1. Create cloud-based MT4/MT5 accounts using investor passwords (read-only)
2. Establish streaming connections for real-time data
3. Sync complete trade history automatically
4. Update account information and balances

## Architecture

### Service Layer (`src/services/metaApiService.ts`)

Core MetaAPI integration functions:

- **`createMetaApiAccount()`** - Creates a cloud MT account using investor password only
- **`connectAccount()`** - Establishes streaming connection using `getStreamingConnection()`
- **`syncAccountInfo()`** - Syncs account data using `waitSynchronized()`
- **`syncTradeHistory()`** - Fetches ALL trade history using `historyStorage.dealsByTimeRange()`
- **`saveToDatabase()`** - Saves trades to Supabase `trades` table
- **`updateConnection()`** - Updates `mt_connections` table with MetaAPI data
- **`logSyncStatus()`** - Logs operations in `mt_sync_logs`
- **`removeAccount()`** - Removes MetaAPI account and connection
- **`checkConnectionStatus()`** - Checks connection status

### API Routes (`src/pages/api/metaapi/`)

#### `connect.ts` - POST /api/metaapi/connect
Creates MetaAPI account and establishes connection:
1. Validates user authentication
2. Creates MetaAPI cloud account
3. Establishes streaming connection
4. Syncs account information
5. Encrypts and stores credentials
6. Saves connection to database

#### `sync.ts` - POST /api/metaapi/sync
Manually triggers trade history sync:
1. Validates connection ownership
2. Syncs account information
3. Fetches ALL trade history (no time limit)
4. Saves trades to database
5. Logs sync results

#### `disconnect.ts` - POST /api/metaapi/disconnect
Removes MetaAPI account and connection:
1. Validates connection ownership
2. Removes MetaAPI account
3. Deletes database connection
4. Cleans up resources

#### `status.ts` - GET /api/metaapi/status
Checks connection status and sync progress:
1. Retrieves connection details
2. Checks MetaAPI status
3. Gets recent sync logs
4. Returns comprehensive status

### Database Schema

#### `mt_connections` table extensions:
```sql
ALTER TABLE mt_connections 
ADD COLUMN IF NOT EXISTS metaapi_account_id TEXT,
ADD COLUMN IF NOT EXISTS metaapi_deployed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS connection_method TEXT DEFAULT 'ea' 
  CHECK (connection_method IN ('ea', 'metaapi'));
```

#### `trades` table extensions:
```sql
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS magic_number INTEGER,
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'mt5';
```

#### `mt_sync_logs` table:
```sql
CREATE TABLE IF NOT EXISTS mt_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'error', 'pending')),
  trades_synced INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Key Features

### 1. Streaming Connection
Uses `getStreamingConnection()` instead of RPC connection for better performance and real-time updates.

### 2. Complete History Sync
Uses `historyStorage.dealsByTimeRange()` to fetch ALL trade history without time restrictions:
```typescript
const startTime = new Date('2000-01-01');
const endTime = new Date();
const deals = await historyStorage.dealsByTimeRange(startTime, endTime);
```

### 3. Duplicate Prevention
Checks `external_id` before inserting trades to prevent duplicates:
```typescript
const { data: existingTrade } = await supabase
  .from('trades')
  .select('id')
  .eq('external_id', deal.id)
  .eq('user_id', userId)
  .single();
```

### 4. Automatic Sync
Background sync can be implemented to automatically sync trades every 5 minutes (currently manual).

### 5. Security
- Investor passwords are encrypted using AES-256-GCM before storage
- Only read-only access is granted (investor password, not master password)
- User authentication required for all operations
- Row-level security on database tables

## Usage Flow

### User Connection Flow:
1. User clicks "Add Account" and selects MetaTrader 4/5
2. User selects "Cloud Bridge" connection method
3. User enters:
   - Login number
   - Broker server (from 500+ brokers)
   - Investor password (read-only)
4. System creates MetaAPI account
5. System deploys and establishes streaming connection
6. System syncs account info and trade history
7. Connection is saved and ready for automatic syncing

### Manual Sync Flow:
1. User clicks "Sync Now" on a connection
2. System syncs account information
3. System fetches ALL trade history
4. System saves new trades to database
5. System logs sync results

### Disconnect Flow:
1. User clicks "Disconnect"
2. System removes MetaAPI account
3. System deletes database connection
4. Previously synced trades remain in database

## Environment Variables

Required environment variable in `.env.local`:
```
VITE_METAAPI_TOKEN=your_metaapi_token_here
```

## Error Handling

The system handles common errors:
- **E_AUTH**: Invalid credentials
- **E_SRV_NO_CONNECTION**: Cannot connect to broker server
- **E_SERVER_TIMEZONE**: Server timezone configuration issue
- **Timeout**: Connection or deployment timeout
- **Rate limit**: Too many requests

Detailed error messages are logged and displayed to users with helpful troubleshooting tips.

## Testing

To test the integration:

1. **Create Connection:**
   ```typescript
   const result = await connectMetaApiAccount({
     platform_type: 'mt5',
     login_number: '12345678',
     broker_server: 'ICMarkets-Demo01',
     investor_password: 'your_investor_password',
     account_id: 'supabase_account_id',
     broker_name: 'IC Markets'
   });
   ```

2. **Sync Trades:**
   ```typescript
   const syncResult = await syncMetaApiAccount('connection_id');
   ```

3. **Check Status:**
   ```typescript
   const status = await getMetaApiStatus('connection_id');
   ```

4. **Disconnect:**
   ```typescript
   const disconnectResult = await disconnectMetaApiAccount('connection_id');
   ```

## Monitoring

Monitor sync operations through:
- `mt_sync_logs` table for sync history
- Console logs with `[MetaAPI Service]` prefix
- UI status indicators showing last sync time
- Recent sync logs displayed in connection details

## Limitations

- Requires valid MetaAPI token
- Broker must be supported by MetaAPI
- Only investor (read-only) passwords accepted
- Connection requires active internet
- Deployment may take 30-60 seconds

## Future Enhancements

1. Implement automatic background sync (every 5 minutes)
2. Add webhook support for real-time trade updates
3. Support for multiple simultaneous connections
4. Enhanced error recovery and retry logic
5. Trade execution capabilities (requires master password)
6. Performance metrics and analytics

## Support

For issues or questions:
- Check browser console for detailed error messages
- Review `mt_sync_logs` table for sync history
- Verify broker server name matches MT4/MT5 exactly
- Ensure investor password (not master password) is used
- Contact MetaAPI support for API-related issues