# MetaAPI Integration Deployment Guide

This guide provides step-by-step instructions for deploying the MetaAPI integration to your Supabase project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Run Database Migration](#step-1-run-database-migration)
3. [Step 2: Deploy Edge Functions](#step-2-deploy-edge-functions)
4. [Step 3: Set Environment Secrets](#step-3-set-environment-secrets)
5. [Step 4: Verify Deployment](#step-4-verify-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Architecture Overview](#architecture-overview)

---

## Prerequisites

Before starting the deployment, ensure you have:

### 1. Supabase CLI Installed

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Verify installation
supabase --version
```

### 2. MetaAPI Account and Token

- Sign up for a MetaAPI account at [https://metaapi.cloud](https://metaapi.cloud)
- Obtain your API token from the MetaAPI dashboard
- Keep your token secure - you'll need it in Step 3

### 3. Project Linked to Supabase

```bash
# Login to Supabase
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Verify link
supabase projects list
```

---

## Step 1: Run Database Migration

The database migration creates all necessary tables, indexes, and Row Level Security (RLS) policies for the MetaAPI integration.

### Option A: Using Supabase SQL Editor (Recommended)

1. Navigate to your Supabase project dashboard
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `/supabase/migrations/20241120000000_complete_metaapi_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute the migration
7. Verify success - you should see "Success. No rows returned"

**If you get an error about missing columns (see Troubleshooting section below):**
- Run the fix migration: `/supabase/migrations/20241120000001_fix_metaapi_columns.sql`

### Option B: Using Supabase CLI

```bash
# Navigate to your project directory
cd /workspace/shadcn-ui

# Push the migration to Supabase
supabase db push

# Or apply a specific migration
supabase db push --include-all
```

### Verify Migration Success

Check that the following tables were created:

```sql
-- Run this query in SQL Editor to verify tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'accounts', 'trades', 'strategies', 
  'goals', 'trading_rules', 'mt_connections', 'mt_sync_logs'
);
```

You should see all 8 tables listed.

---

## Step 2: Deploy Edge Functions

Deploy all four MetaAPI Edge Functions to handle connection, synchronization, disconnection, and status checks.

### Deploy All Functions

```bash
# Navigate to your project directory
cd /workspace/shadcn-ui

# Deploy metaapi-connect function
supabase functions deploy metaapi-connect

# Deploy metaapi-disconnect function
supabase functions deploy metaapi-disconnect

# Deploy metaapi-sync function
supabase functions deploy metaapi-sync

# Deploy metaapi-status function
supabase functions deploy metaapi-status
```

### Verify Deployment

```bash
# List all deployed functions
supabase functions list
```

You should see all four functions listed with their URLs:
- `metaapi-connect`
- `metaapi-disconnect`
- `metaapi-sync`
- `metaapi-status`

### Function URLs

Your Edge Functions will be available at:
```
https://<project-ref>.supabase.co/functions/v1/metaapi-connect
https://<project-ref>.supabase.co/functions/v1/metaapi-disconnect
https://<project-ref>.supabase.co/functions/v1/metaapi-sync
https://<project-ref>.supabase.co/functions/v1/metaapi-status
```

---

## Step 3: Set Environment Secrets

Set the MetaAPI token as a secret that Edge Functions can access.

### Set METAAPI_TOKEN Secret

```bash
# Set the MetaAPI token secret
supabase secrets set METAAPI_TOKEN=your_metaapi_token_here

# Verify the secret was set (won't show the value)
supabase secrets list
```

### Important Notes

- **Never commit your MetaAPI token to version control**
- The token is stored securely in Supabase and only accessible to Edge Functions
- If you need to update the token, simply run the `secrets set` command again

### Optional: Set Additional Secrets

If you need to configure other settings:

```bash
# Set custom timeout (optional)
supabase secrets set METAAPI_TIMEOUT=60000

# Set custom region (optional)
supabase secrets set METAAPI_REGION=new-york
```

---

## Step 4: Verify Deployment

### 1. Test Database Tables

Run this query in SQL Editor to verify RLS policies:

```sql
-- Test that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('mt_connections', 'mt_sync_logs');
```

Both tables should show `rowsecurity = true`.

### 2. Test Edge Functions

You can test the functions using curl or the Supabase dashboard:

```bash
# Test metaapi-status function (requires authentication)
curl -X POST \
  'https://<project-ref>.supabase.co/functions/v1/metaapi-status' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 3. Test from the Application

1. Start your application:
   ```bash
   cd /workspace/shadcn-ui
   pnpm run dev
   ```

2. Navigate to the **Accounts** page
3. Click **Connect MT4/MT5 Account**
4. Fill in the connection details:
   - Platform: MT4 or MT5
   - Login: Your MT account login number
   - Server: Your broker's server name
   - Investor Password: Your investor/read-only password

5. Click **Connect** and verify:
   - Connection status shows "Connected"
   - Account balance is displayed
   - No errors in browser console

### 4. Check Supabase Logs

Monitor Edge Function logs for any errors:

```bash
# View logs for a specific function
supabase functions logs metaapi-connect

# View logs with tail (live updates)
supabase functions logs metaapi-connect --tail
```

Or check logs in the Supabase dashboard:
1. Go to **Edge Functions** in the left sidebar
2. Click on a function name
3. View the **Logs** tab

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 0: Migration Fails with "column does not exist" Error

**Error Message:**
```
ERROR: 42703: column "metaapi_account_id" does not exist
```

**Cause:** The `mt_connections` table already exists from a previous migration but is missing the new MetaAPI columns.

**Solution:**

1. Run the fix migration in Supabase SQL Editor:
   - Navigate to **SQL Editor** in Supabase dashboard
   - Click **New Query**
   - Copy the entire contents of `/supabase/migrations/20241120000001_fix_metaapi_columns.sql`
   - Paste into the SQL Editor
   - Click **Run**

2. Or use Supabase CLI:
   ```bash
   cd /workspace/shadcn-ui
   supabase db push
   ```

3. Verify the fix worked by checking for the new columns:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'mt_connections' 
   AND column_name IN ('metaapi_account_id', 'connection_status', 'account_balance');
   ```

**What the fix migration does:**
- Safely adds all missing columns to `mt_connections` table
- Recreates `mt_sync_logs` table with correct structure
- Adds all MetaAPI-specific columns to `trades` table
- Creates necessary indexes and RLS policies
- Safe to run multiple times (idempotent)

#### Issue 1: Migration Fails with "relation already exists"

**Solution:** This is usually safe to ignore if you're re-running the migration. The migration uses `CREATE TABLE IF NOT EXISTS` to prevent errors.

If you need to reset:
```sql
-- WARNING: This will delete all data
DROP TABLE IF EXISTS public.mt_sync_logs CASCADE;
DROP TABLE IF EXISTS public.mt_connections CASCADE;
-- Then re-run the migration
```

#### Issue 2: Edge Functions Return 401 Unauthorized

**Cause:** Missing or invalid authentication token.

**Solution:**
1. Verify you're passing the Supabase anon key in the Authorization header
2. Check that the user is authenticated in your application
3. Verify RLS policies are correctly set

```typescript
// Correct way to call Edge Functions
const { data, error } = await supabase.functions.invoke('metaapi-connect', {
  body: { /* your data */ }
});
```

#### Issue 3: Edge Functions Return 500 Internal Server Error

**Cause:** Missing METAAPI_TOKEN secret or invalid token.

**Solution:**
1. Verify the secret is set:
   ```bash
   supabase secrets list
   ```
2. Check Edge Function logs:
   ```bash
   supabase functions logs metaapi-connect
   ```
3. Verify your MetaAPI token is valid at [https://metaapi.cloud](https://metaapi.cloud)

#### Issue 4: Connection Status Shows "Error"

**Cause:** Invalid MT4/MT5 credentials or broker server name.

**Solution:**
1. Verify your MT4/MT5 login credentials
2. Check the broker server name is correct (e.g., "ICMarkets-Demo")
3. Ensure you're using an **investor password**, not the master password
4. Check MetaAPI dashboard for account status

#### Issue 5: Trades Not Syncing

**Cause:** MetaAPI account not deployed or connection issues.

**Solution:**
1. Check `mt_connections` table for `metaapi_deployed_at` timestamp
2. Verify `connection_status` is "connected"
3. Check `mt_sync_logs` table for error messages
4. Manually trigger sync from the Accounts page

#### Issue 6: RLS Policies Blocking Access

**Cause:** User ID mismatch or incorrect RLS policy.

**Solution:**
1. Verify user is authenticated:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User ID:', user?.id);
   ```
2. Check RLS policies in SQL Editor:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'mt_connections';
   ```

### Checking Logs

#### Edge Function Logs

```bash
# View recent logs
supabase functions logs metaapi-connect --limit 50

# View logs with specific time range
supabase functions logs metaapi-sync --since 1h

# View logs in real-time
supabase functions logs metaapi-status --tail
```

#### Database Logs

Check the `mt_sync_logs` table for synchronization history:

```sql
SELECT 
  sl.*,
  mc.login_number,
  mc.broker_server
FROM mt_sync_logs sl
JOIN mt_connections mc ON sl.connection_id = mc.id
ORDER BY sl.synced_at DESC
LIMIT 10;
```

### Verify RLS Policies

Test RLS policies are working correctly:

```sql
-- This should only return connections for the authenticated user
SELECT * FROM mt_connections;

-- This should only return sync logs for the authenticated user's connections
SELECT * FROM mt_sync_logs;
```

### Reset Connection

If a connection is stuck in an error state:

```sql
-- Reset connection status (replace with your connection ID)
UPDATE mt_connections 
SET 
  connection_status = 'disconnected',
  error_message = NULL,
  last_sync_time = NULL
WHERE id = 'your-connection-id';
```

---

## Architecture Overview

### Database Schema

```
┌─────────────────┐
│   auth.users    │
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┬──────────────────┐
         │                 │                 │                  │
┌────────▼────────┐ ┌──────▼──────┐ ┌───────▼───────┐ ┌────────▼────────┐
│    profiles     │ │   accounts  │ │  strategies   │ │      goals      │
└─────────────────┘ └──────┬──────┘ └───────────────┘ └─────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
         ┌──────▼──────┐      ┌──────▼──────────┐
         │   trades    │      │ mt_connections  │
         └─────────────┘      └──────┬──────────┘
                                     │
                              ┌──────▼──────────┐
                              │ mt_sync_logs    │
                              └─────────────────┘
```

### Edge Functions Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 1. Connect MT Account
       ▼
┌─────────────────────┐
│ metaapi-connect     │──────┐
└─────────────────────┘      │
       │                     │ 2. Create MetaAPI Account
       │                     ▼
       │              ┌─────────────┐
       │              │  MetaAPI    │
       │              │   Cloud     │
       │              └─────────────┘
       │                     │
       │ 3. Store Connection │
       ▼                     │
┌─────────────────────┐      │
│   mt_connections    │◄─────┘
└─────────────────────┘
       │
       │ 4. Sync Trades
       ▼
┌─────────────────────┐
│  metaapi-sync       │──────┐
└─────────────────────┘      │
       │                     │ 5. Fetch History
       │                     ▼
       │              ┌─────────────┐
       │              │  MetaAPI    │
       │              │   Cloud     │
       │              └─────────────┘
       │                     │
       │ 6. Save Trades      │
       ▼                     │
┌─────────────────────┐      │
│      trades         │◄─────┘
└─────────────────────┘
       │
       │ 7. Log Sync
       ▼
┌─────────────────────┐
│   mt_sync_logs      │
└─────────────────────┘
```

### Security Model

1. **Row Level Security (RLS)**: All tables have RLS enabled
2. **User Isolation**: Users can only access their own data
3. **Encrypted Passwords**: Investor passwords are encrypted before storage
4. **Secure Secrets**: MetaAPI token stored as Supabase secret
5. **Authentication Required**: All Edge Functions require valid JWT token

---

## Next Steps

After successful deployment:

1. **Test the Integration**
   - Connect a demo MT4/MT5 account
   - Verify trades sync correctly
   - Check account balance updates

2. **Monitor Performance**
   - Review sync logs regularly
   - Monitor Edge Function execution times
   - Check for any error patterns

3. **Configure Sync Schedule**
   - Set up periodic sync (e.g., every 5 minutes)
   - Implement webhook listeners for real-time updates
   - Configure retry logic for failed syncs

4. **User Documentation**
   - Create user guides for connecting MT accounts
   - Document supported brokers
   - Provide troubleshooting tips

5. **Production Considerations**
   - Set up monitoring and alerts
   - Implement rate limiting
   - Configure backup and disaster recovery
   - Review and optimize RLS policies

---

## Support

For issues or questions:

- **MetaAPI Documentation**: [https://metaapi.cloud/docs](https://metaapi.cloud/docs)
- **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
- **Project Issues**: Check the project's issue tracker

---

## Changelog

### Version 1.0.1 (2024-11-20)
- Added fix migration for missing columns error
- Enhanced troubleshooting section with column error solution
- Improved migration idempotency

### Version 1.0.0 (2024-11-20)
- Initial deployment guide
- Complete database schema migration
- Four Edge Functions deployed
- RLS policies configured
- Comprehensive troubleshooting section

---

**Deployment Complete! 🎉**

Your MetaAPI integration is now ready to use. Users can connect their MT4/MT5 accounts and start syncing trades automatically.