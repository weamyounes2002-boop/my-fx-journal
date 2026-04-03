# CRITICAL ISSUE: Edge Function Using Wrong Table Name

## Problem Identified

The Edge Function `/workspace/shadcn-ui/supabase/functions/metaapi-connect/index.ts` is still using the **OLD** table name `mt_accounts` (line 214), but the database migration created the **NEW** table `mt_connections`.

## Evidence

### Edge Function Code (Line 214):
```typescript
const { error: dbError } = await supabase.from("mt_accounts").upsert(
```

### Frontend Code (Accounts.tsx Line 57):
```typescript
const { data, error } = await supabase
  .from('mt_connections')  // ✅ CORRECT - Uses mt_connections
```

### Database Schema:
The migration created table: `mt_connections` (NOT `mt_accounts`)

## Impact

When users try to connect an MT account:
1. ✅ MetaAPI account creation succeeds
2. ✅ MetaAPI account deployment succeeds  
3. ❌ **Database insert FAILS** - tries to insert into non-existent `mt_accounts` table
4. ❌ Frontend shows error: "Database error: relation 'mt_accounts' does not exist"
5. ❌ Connection is NOT saved in database
6. ❌ Frontend cannot display the connected account

## Required Fix

The user mentioned they will "replace the code of edge function by the new one". They need to update line 214 in the Edge Function:

### Change FROM:
```typescript
const { error: dbError } = await supabase.from("mt_accounts").upsert(
```

### Change TO:
```typescript
const { error: dbError } = await supabase.from("mt_connections").upsert(
```

## Additional Schema Alignment Needed

The Edge Function also needs to match the `mt_connections` table schema. Current payload has mismatches:

### Current Edge Function Payload (Lines 214-230):
```typescript
{
  id: account_id,
  user_id: user.id,
  platform_type,
  login_number,
  broker_server,
  broker_name: broker_name || null,
  metaapi_account_id: metaApiAccountId,
  connection_status: "connected",
  last_sync: new Date().toISOString(),  // ❌ Wrong column name
  created_at: new Date().toISOString(),
}
```

### Correct Schema (mt_connections table):
- ❌ `last_sync` should be `last_sync_time`
- ✅ Other fields match

### Required Payload Update:
```typescript
{
  id: account_id,
  user_id: user.id,
  platform_type,
  login_number,
  broker_server,
  broker_name: broker_name || null,
  metaapi_account_id: metaApiAccountId,
  connection_status: "connected",
  last_sync_time: new Date().toISOString(),  // ✅ FIXED
  created_at: new Date().toISOString(),
}
```

## Testing Status

⚠️ **CANNOT TEST** until the Edge Function is updated with the correct table name and column names.

## Next Steps

1. User updates Edge Function code (they mentioned they will do this)
2. Deploy updated Edge Function: `supabase functions deploy metaapi-connect`
3. Then we can proceed with end-to-end testing

## Files to Update

1. `/workspace/shadcn-ui/supabase/functions/metaapi-connect/index.ts`
   - Line 214: Change `mt_accounts` to `mt_connections`
   - Line 224: Change `last_sync` to `last_sync_time`