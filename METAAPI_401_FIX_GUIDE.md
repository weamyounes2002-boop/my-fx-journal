# MetaAPI 401 Unauthorized Error - Complete Fix Guide

## Problem
Getting 401 Unauthorized errors when syncing historical data from MetaAPI, despite having the METAAPI_TOKEN configured.

## Root Causes & Solutions

### 1. MetaAPI Token Not Set in Edge Functions
The METAAPI_TOKEN must be set as a **Supabase Edge Function secret**, not just a project secret.

**Fix:**
```bash
# Set the token for Edge Functions
supabase secrets set METAAPI_TOKEN=your_metaapi_token_here

# Verify it's set
supabase secrets list
```

**Alternative (via Supabase Dashboard):**
1. Go to your Supabase project
2. Navigate to Edge Functions → Secrets
3. Add a new secret:
   - Key: `METAAPI_TOKEN`
   - Value: Your MetaAPI token from https://app.metaapi.cloud/token

### 2. MetaAPI Account Not Deployed
MetaAPI accounts must be in "DEPLOYED" state before they can be accessed via API.

**Check Account Status:**
```bash
curl -X GET \
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/{METAAPI_ACCOUNT_ID}" \
  -H "auth-token: YOUR_METAAPI_TOKEN"
```

**Deploy Account (if needed):**
```bash
curl -X POST \
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/{METAAPI_ACCOUNT_ID}/deploy" \
  -H "auth-token: YOUR_METAAPI_TOKEN"
```

**Or via MetaAPI Dashboard:**
1. Go to https://app.metaapi.cloud/accounts
2. Find your account
3. Click "Deploy" if status is "UNDEPLOYED"
4. Wait for status to become "DEPLOYED" (may take 1-2 minutes)

### 3. Invalid or Expired Token
MetaAPI tokens can expire or become invalid.

**Fix:**
1. Go to https://app.metaapi.cloud/token
2. Generate a new token
3. Update the token in Supabase:
   ```bash
   supabase secrets set METAAPI_TOKEN=your_new_token
   ```

### 4. Wrong API Endpoint or Account ID
Verify you're using the correct MetaAPI account ID.

**Check in Database:**
```sql
SELECT 
  id,
  account_id,
  metaapi_account_id,
  connection_status,
  login,
  server
FROM mt_connections
WHERE user_id = auth.uid();
```

The `metaapi_account_id` should match the account ID in your MetaAPI dashboard.

## Testing the Fix

### Step 1: Verify Token Works
```bash
# Test token directly with MetaAPI
curl -X GET \
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts" \
  -H "auth-token: YOUR_METAAPI_TOKEN"
```

Expected: List of your MetaAPI accounts (should return 200 OK)

### Step 2: Check Account Deployment
```bash
curl -X GET \
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/{METAAPI_ACCOUNT_ID}" \
  -H "auth-token: YOUR_METAAPI_TOKEN"
```

Expected response should include:
```json
{
  "state": "DEPLOYED",
  "connectionStatus": "CONNECTED"
}
```

### Step 3: Test Edge Function
After setting the token and deploying the account, test the sync:

1. Go to your app's Accounts page
2. Click "Sync Historical Data"
3. Check browser console for detailed logs
4. Check Supabase Edge Function logs for server-side errors

## Common Error Messages

### "MetaAPI token not configured"
- **Cause:** METAAPI_TOKEN not set in Edge Function secrets
- **Fix:** Run `supabase secrets set METAAPI_TOKEN=your_token`

### "MetaAPI authentication failed. The METAAPI_TOKEN may be invalid or expired"
- **Cause:** Token is invalid or expired
- **Fix:** Generate new token at https://app.metaapi.cloud/token

### "Account not connected to MetaAPI"
- **Cause:** `metaapi_account_id` is null in `mt_connections` table
- **Fix:** Reconnect the account through the app's connection flow

### "NotFound: account not found"
- **Cause:** MetaAPI account ID doesn't exist or was deleted
- **Fix:** Create a new account in MetaAPI dashboard and reconnect

### "TooManyRequestsException"
- **Cause:** Rate limit exceeded
- **Fix:** Wait a few minutes before retrying

## Verification Checklist

- [ ] METAAPI_TOKEN is set in Supabase Edge Function secrets
- [ ] Token is valid (test with curl command above)
- [ ] MetaAPI account status is "DEPLOYED"
- [ ] MetaAPI account connectionStatus is "CONNECTED"
- [ ] `metaapi_account_id` exists in `mt_connections` table
- [ ] Edge Functions are deployed (run `supabase functions deploy`)
- [ ] Browser console shows no CORS errors
- [ ] Edge Function logs show the token is being retrieved

## Still Having Issues?

### Enable Detailed Logging
The Edge Functions already have extensive logging. Check:

1. **Browser Console:** Shows client-side errors and API responses
2. **Supabase Logs:** 
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for `[MetaAPI Fetch History]` entries
3. **MetaAPI Logs:**
   - Go to https://app.metaapi.cloud/logs
   - Check for API call failures

### Debug Commands
```bash
# Check if Edge Functions are deployed
supabase functions list

# View Edge Function logs
supabase functions logs metaapi-fetch-history

# Redeploy all MetaAPI functions
supabase functions deploy metaapi-fetch-history
supabase functions deploy metaapi-account-metrics
supabase functions deploy metaapi-open-positions
```

## Quick Fix Script

```bash
#!/bin/bash
# Quick fix script for MetaAPI 401 errors

echo "Setting MetaAPI token..."
read -p "Enter your MetaAPI token: " token
supabase secrets set METAAPI_TOKEN=$token

echo "Deploying Edge Functions..."
supabase functions deploy metaapi-fetch-history
supabase functions deploy metaapi-account-metrics
supabase functions deploy metaapi-open-positions

echo "Done! Now:"
echo "1. Go to https://app.metaapi.cloud/accounts"
echo "2. Ensure your account is DEPLOYED"
echo "3. Try syncing again in the app"
```

## Next Steps After Fix

Once the 401 error is resolved:

1. The sync should complete successfully
2. Historical trades will appear in the Analytics page
3. Account metrics will be updated
4. Open positions will be displayed

If you continue to experience issues after following this guide, please check:
- MetaAPI service status: https://status.metaapi.cloud/
- Your MetaAPI subscription plan and limits
- Network connectivity and firewall settings