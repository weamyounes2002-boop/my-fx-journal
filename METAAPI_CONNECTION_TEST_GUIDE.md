# MetaAPI Connection Flow - Complete Test Guide

## Current Status ✅

### Database Tables Created:
- ✅ `mt_connections` - Stores MT5 account connections
- ✅ `mt_sync_logs` - Tracks sync history
- ✅ `trades` table updated with MetaAPI columns

### Issue Found 🔧:
The Edge Function `metaapi-connect` is trying to insert into `mt_accounts` table, but the migration created `mt_connections` table instead.

## Fix Required

The Edge Function needs to be updated to use `mt_connections` table instead of `mt_accounts`.

### Current Edge Function Code (Line 214):
```typescript
const { error: dbError } = await supabase.from("mt_accounts").upsert(...)
```

### Should Be:
```typescript
const { error: dbError } = await supabase.from("mt_connections").upsert(...)
```

### Also, the field mapping needs to match the table schema:

**Current payload:**
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
  last_sync: new Date().toISOString(),
  created_at: new Date().toISOString(),
}
```

**Should be (matching mt_connections schema):**
```typescript
{
  user_id: user.id,
  account_id: account_id,
  login: login_number,
  server: broker_server,
  broker: broker_name || null,
  metaapi_account_id: metaApiAccountId,
  connection_status: "connected",
  metaapi_deployed_at: new Date().toISOString(),
  last_sync_time: new Date().toISOString(),
}
```

## Complete Test Flow (After Fix)

### Prerequisites:
1. ✅ Database migration applied (DONE)
2. ⚠️ Edge Function needs update (PENDING)
3. ⚠️ MetaAPI account topped up (USER ACTION REQUIRED)
4. ✅ Supabase environment variables set (METAAPI_TOKEN)

### Test Steps:

#### Step 1: Update Edge Function
1. Fix the table name from `mt_accounts` to `mt_connections`
2. Fix the field mapping to match the schema
3. Redeploy the Edge Function

#### Step 2: Test Connection Flow
1. Open your app at the deployed URL
2. Go to **Accounts** page
3. Click **"Connect MT Account"** button
4. Fill in the form:
   - Platform Type: MT5
   - Broker Name: "Test Broker"
   - Login Number: "12345678"
   - Broker Server: "TestServer-Demo"
   - Investor Password: "test_password"
5. Click **"Connect Account"**

#### Step 3: Expected Results

**Success Case:**
- ✅ Success message: "MT account connected successfully!"
- ✅ New card appears showing the connected account
- ✅ Status shows "connected" with green checkmark
- ✅ Balance, Equity, Margin show $0.00 (will update after sync)

**Check Database:**
```sql
SELECT * FROM mt_connections WHERE user_id = 'your-user-id';
```

Should show:
- ✅ New row with your account details
- ✅ `metaapi_account_id` populated
- ✅ `connection_status` = 'connected'
- ✅ `metaapi_deployed_at` timestamp

**Check MetaAPI Dashboard:**
- Go to https://app.metaapi.cloud/
- Click "Accounts" in sidebar
- ✅ Should see your newly created account
- ✅ Status should be "DEPLOYED" or "DEPLOYING"

#### Step 4: Test Sync Flow
1. Click **"Sync"** button on the connected account
2. Wait for sync to complete

**Expected:**
- ✅ Success message: "Successfully synced X trades"
- ✅ Account balance/equity updated
- ✅ New row in `mt_sync_logs` table
- ✅ Trades appear in `trades` table

#### Step 5: Test Disconnect Flow
1. Click **trash icon** on the account
2. Confirm deletion

**Expected:**
- ✅ Success message: "MT account disconnected successfully"
- ✅ Account card disappears
- ✅ Row removed from `mt_connections` table
- ✅ Account still exists in MetaAPI (manual cleanup required)

## Error Scenarios to Test

### 1. Invalid Credentials
**Test:** Use wrong password
**Expected:** Error message: "Failed to create MetaAPI account: [error details]"

### 2. Insufficient MetaAPI Credits
**Test:** Try to connect without topping up MetaAPI
**Expected:** Error message with billing/quota error

### 3. Duplicate Connection
**Test:** Try to connect same account twice
**Expected:** Should update existing connection (upsert behavior)

### 4. Network Error
**Test:** Disconnect internet, try to connect
**Expected:** Error message: "Failed to connect MT account"

## Debugging Tips

### Check Edge Function Logs:
1. Go to Supabase Dashboard
2. Click "Edge Functions" → "metaapi-connect"
3. Click "Logs" tab
4. Look for console.log outputs

### Check Browser Console:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for `[MetaAPI Client]` and `[Frontend]` logs

### Check Database:
```sql
-- Check connections
SELECT * FROM mt_connections;

-- Check sync logs
SELECT * FROM mt_sync_logs;

-- Check trades
SELECT * FROM trades WHERE platform = 'mt5';
```

## Next Steps After Successful Test

1. ✅ Connection works → Test with real MT5 demo account
2. ✅ Sync works → Set up automatic sync (cron job)
3. ✅ All tests pass → Deploy to production
4. ✅ Monitor MetaAPI usage and costs

## Cost Estimation

**MetaAPI Pricing:**
- Read-only account: ~$30-40/month
- Includes: Real-time data, trade history, account info
- No per-request fees for basic usage

**Supabase:**
- Free tier: 500MB database, 2GB bandwidth
- Edge Functions: 500K invocations/month free
- Should be sufficient for personal use

## Support

If you encounter issues:
1. Check Edge Function logs first
2. Check browser console for frontend errors
3. Verify MetaAPI account has credits
4. Check database tables exist and have correct schema
5. Verify environment variables are set correctly

---

**Status:** Ready to test after Edge Function fix! 🚀
