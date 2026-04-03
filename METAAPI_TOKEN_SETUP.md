# MetaAPI Token Setup Guide

## Problem
The Edge Functions are returning 401 Unauthorized errors because the `METAAPI_TOKEN` environment variable is not configured in Supabase.

## Solution

### Step 1: Get Your MetaAPI Token

1. Go to [MetaAPI Dashboard](https://app.metaapi.cloud/)
2. Log in to your account
3. Navigate to **Settings** → **API Tokens**
4. Copy your API token (it should start with `eyJ...`)

### Step 2: Set the Token in Supabase

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Scroll down to **Secrets**
4. Click **Add new secret**
5. Set:
   - **Name**: `METAAPI_TOKEN`
   - **Value**: Your MetaAPI token (paste the token you copied)
6. Click **Save**

#### Option B: Using Supabase CLI

```bash
# Set the secret using Supabase CLI
supabase secrets set METAAPI_TOKEN=your_metaapi_token_here

# Verify the secret is set
supabase secrets list
```

### Step 3: Redeploy Edge Functions

After setting the secret, you need to redeploy the Edge Functions for them to pick up the new environment variable:

```bash
# Redeploy all Edge Functions
supabase functions deploy metaapi-fetch-history
supabase functions deploy metaapi-account-metrics
supabase functions deploy metaapi-open-positions
supabase functions deploy metaapi-store-history
```

Or redeploy all at once:

```bash
supabase functions deploy
```

### Step 4: Test the Connection

1. Go to your application's Analytics page
2. Click the **"Sync Historical Data"** button
3. The sync should now work without 401 errors

## Verification

To verify the token is set correctly, check the Edge Function logs:

1. Go to Supabase Dashboard → **Edge Functions** → **Logs**
2. Look for log entries from your functions
3. You should see successful API calls to MetaAPI instead of 401 errors

## Troubleshooting

### Still Getting 401 Errors?

1. **Verify Token Format**: Make sure you copied the entire token (it's usually quite long)
2. **Check Token Validity**: Log in to MetaAPI dashboard and verify the token is still active
3. **Regenerate Token**: If the token is old, generate a new one in MetaAPI dashboard
4. **Redeploy Functions**: Make sure you redeployed the functions after setting the secret

### How to Check if Secret is Set

Run this command to list all secrets:

```bash
supabase secrets list
```

You should see `METAAPI_TOKEN` in the list (the value will be hidden for security).

## Important Notes

- The MetaAPI token is **sensitive** - never commit it to git or share it publicly
- The token is used by Edge Functions to authenticate with MetaAPI on behalf of all users
- Each user's individual MT account credentials are stored separately in the `mt_connections` table
- The global token is only used for API authentication, not for accessing individual accounts

## Architecture

```
User Request → Edge Function → MetaAPI API
                ↓
        Uses METAAPI_TOKEN (global)
                ↓
        Accesses user's MT account via metaapi_account_id
```

The flow:
1. User clicks "Sync Historical Data"
2. Edge Function authenticates with MetaAPI using `METAAPI_TOKEN`
3. Edge Function retrieves the user's `metaapi_account_id` from database
4. Edge Function fetches data for that specific account
5. Data is stored in user's database tables

## Next Steps

After setting up the token:
1. Test the sync functionality
2. Verify data appears in Analytics page
3. Check that historical trades are displayed correctly