# Incremental Sync Feature - MetaAPI Cost Optimization

## Overview
This feature minimizes MetaAPI costs by implementing incremental syncing. After the initial sync, only new data since the last sync is fetched, dramatically reducing API calls and costs.

## How It Works

### 1. Database Schema
Added `last_synced_date` column to `mt_connections` table:
```sql
ALTER TABLE mt_connections
ADD COLUMN IF NOT EXISTS last_synced_date TIMESTAMP WITH TIME ZONE;
```

### 2. Sync Logic

#### Initial Sync (First Time)
- **When**: `last_synced_date` is NULL (account never synced)
- **Data Range**: Last 6 months from current date
- **Button Text**: "Initial Sync (All Data)"
- **Cost**: Higher (fetching 6 months of data)

#### Incremental Sync (Subsequent Times)
- **When**: `last_synced_date` exists
- **Data Range**: From `last_synced_date` to current date
- **Button Text**: "Update Sync (New Data)"
- **Cost**: Minimal (only fetching new data since last sync)

### 3. Updated Files

**Migration File:**
- `/workspace/shadcn-ui/supabase/migrations/20241124000000_add_last_synced_date.sql`
  - Adds `last_synced_date` column to track sync history

**API Client:**
- `/workspace/shadcn-ui/src/api/metaApiClient.ts`
  - Added `getLastSyncedDate()` - Fetches last sync timestamp
  - Added `updateLastSyncedDate()` - Updates timestamp after successful sync
  - Modified `syncHistoricalData()` - Implements incremental sync logic

**UI Component:**
- `/workspace/shadcn-ui/src/components/HistoricalDataSync.tsx`
  - Fetches and displays last synced date
  - Shows appropriate button text (Initial vs Update)
  - Displays "Last synced: X minutes/hours/days ago"
  - Shows sync type in results (initial vs incremental)

## User Experience

### Before First Sync
```
Button: "Initial Sync (All Data)"
Status: (no last synced date shown)
```

### After First Sync
```
Button: "Update Sync (New Data)"
Status: "Last synced: 5 minutes ago"
```

### Sync Progress Messages
- **Initial**: "Initial sync: fetching all historical data..."
- **Incremental**: "Incremental sync: fetching new data only..."

### Sync Results
Shows sync type in the success message:
- "Successfully synced X trades (initial sync - last 6 months)"
- "Successfully synced X trades (incremental sync - new data only)"

## Cost Savings Example

### Scenario: Daily Sync for 30 Days

**Without Incremental Sync:**
- Day 1: Fetch 6 months (180 days) = 180 API calls
- Day 2: Fetch 6 months (180 days) = 180 API calls
- Day 30: Fetch 6 months (180 days) = 180 API calls
- **Total: 5,400 API calls**

**With Incremental Sync:**
- Day 1: Fetch 6 months (180 days) = 180 API calls (initial)
- Day 2: Fetch 1 day = 1 API call (incremental)
- Day 30: Fetch 1 day = 1 API call (incremental)
- **Total: 209 API calls**

**Savings: 96% reduction in API calls!**

## Technical Details

### Date Range Calculation

```typescript
// Initial sync (no last_synced_date)
startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, endDate.getDate());

// Incremental sync (has last_synced_date)
startDate = new Date(lastSyncedDate);
```

### Timestamp Update

After successful sync, the `last_synced_date` is updated to current timestamp:
```typescript
await supabase
  .from('mt_connections')
  .update({ last_synced_date: new Date().toISOString() })
  .eq('account_id', accountId);
```

### UI State Management

The component tracks:
- `lastSyncedDate` - Timestamp of last successful sync
- `isInitialSync` - Boolean flag (true if never synced)
- Automatically refreshes after successful sync

## Benefits

1. **Cost Reduction**: 90-96% reduction in MetaAPI API calls
2. **Faster Syncs**: Incremental syncs complete in seconds vs minutes
3. **Better UX**: Users see clear status and sync type
4. **Automatic**: No user configuration needed
5. **Transparent**: Shows last sync time and sync type

## Deployment Steps

1. **Run Migration:**
   ```bash
   # Migration will be applied automatically on next Supabase push
   supabase db push
   ```

2. **Deploy Code:**
   - Frontend changes are already in the codebase
   - No Edge Function changes needed

3. **Test:**
   - First sync: Should show "Initial Sync (All Data)"
   - Second sync: Should show "Update Sync (New Data)" with last synced time
   - Verify only new data is fetched in subsequent syncs

## Free Plan Compatibility

✅ **Yes, this works on Supabase Free Plan!**

The feature only uses:
- Standard database column (no special features)
- Basic SELECT/UPDATE queries
- No additional Edge Functions
- No extra storage

## Monitoring

Check sync efficiency:
```sql
-- View all accounts with their last sync dates
SELECT 
  account_id,
  last_synced_date,
  EXTRACT(EPOCH FROM (NOW() - last_synced_date))/3600 as hours_since_sync
FROM mt_connections
WHERE last_synced_date IS NOT NULL
ORDER BY last_synced_date DESC;
```

## Future Enhancements

Possible improvements:
1. **Configurable Initial Range**: Let users choose initial sync period (1 month, 3 months, 6 months, 1 year)
2. **Auto-Sync Schedule**: Automatic daily/weekly syncs
3. **Sync History**: Track all sync operations with timestamps and results
4. **Smart Chunking**: Adjust chunk size based on data density