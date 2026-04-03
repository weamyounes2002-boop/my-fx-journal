# Edge Function Authentication Fix Guide

## Problem 1: Authentication Error (FIXED)
The metaapi-connect Edge Function was returning 401 Unauthorized errors because it wasn't correctly extracting the JWT token from the Authorization header.

## Problem 2: MetaAPI Validation Error (FIXED)
After fixing authentication, MetaAPI was rejecting account creation with validation errors because the request payload included unexpected fields.

## Solutions Applied

### Fix 1: Token Extraction (Line 48)
```typescript
// OLD (incorrect):
const token = authHeader;

// NEW (correct):
const token = authHeader.replace('Bearer ', '');
```

### Fix 2: Simplified Account Creation Payload (Lines 114-121)
```typescript
// OLD (caused validation error):
body: JSON.stringify({
  name: `${broker_name || "MT"} Account ${login_number}`,
  type: "cloud",
  login: login_number,
  password: investor_password,
  server: broker_server,
  platform: platform_type,
  magic: 0,                          // ❌ Remove
  application: "MetaApi",            // ❌ Remove
  connectionStatus: "DISCONNECTED",  // ❌ Remove
  state: "DEPLOYED",                 // ❌ Remove
  accessToken: metaApiToken,         // ❌ Remove
})

// NEW (correct - minimal payload):
body: JSON.stringify({
  name: `${broker_name} - ${login_number}`,
  type: 'cloud',
  login: login_number,
  password: investor_password,
  server: broker_server,
  platform: platform_type,
})
```

**Why this works:**
- MetaAPI only expects 6 essential fields during account creation
- Status fields (connectionStatus, state) are set by MetaAPI after creation
- The accessToken should be in the header, not the body
- Extra fields (magic, application) cause validation errors

## Deployment Instructions

### Step 1: Delete Old Function
1. Go to Supabase Dashboard → Edge Functions
2. Find `metaapi-connect` function
3. Click the three dots (⋮) → Delete
4. Confirm deletion

### Step 2: Deploy Updated Function
1. In MGX Editor, locate: `/workspace/shadcn-ui/supabase/functions/metaapi-connect/index.ts`
2. Copy the entire updated code (all 277 lines)
3. Go to Supabase Dashboard → Edge Functions
4. Click "Create a new function"
5. Name: `metaapi-connect`
6. Paste the code
7. Click "Deploy function"

### Step 3: Verify Environment Variables
Make sure these secrets are set in Supabase Dashboard → Edge Functions → Secrets:
- `METAAPI_TOKEN`: Your MetaAPI token
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

### Step 4: Apply Same Fixes to Other Functions
The same authentication fix should be applied to:
- `metaapi-disconnect`
- `metaapi-sync`
- `metaapi-status`

For each function, update the token extraction line:
```typescript
const token = authHeader.replace('Bearer ', '');
```

## Testing Instructions

### 1. Test Authentication & Account Creation
1. Open your app in the browser
2. Sign in with your credentials
3. Open Browser DevTools (F12) → Console
4. Try connecting an MT5 account

### 2. Check Logs
Look for these log messages in the console:
```
[metaapi-connect] Token extracted, length: [number]
[metaapi-connect] Auth check - User: [user_id] Error: null
[metaapi-connect] Creating MetaAPI account...
[metaapi-connect] MetaAPI account created: [account_id]
[metaapi-connect] Deploying account...
[metaapi-connect] Account deployed and connected!
[metaapi-connect] Connection successful!
```

### 3. Expected Results
- ✅ No 401 Unauthorized errors
- ✅ No MetaAPI validation errors
- ✅ Account creation succeeds
- ✅ Connection appears in the Accounts page
- ✅ Console shows successful connection logs

### 4. If Still Getting Errors

**401 Errors:**
1. User is logged in (check localStorage for supabase auth token)
2. Token is being sent in Authorization header
3. SUPABASE_URL and SUPABASE_ANON_KEY are correct in Edge Function secrets

**Validation Errors:**
1. Check that you're using the updated code with the simplified payload
2. Verify METAAPI_TOKEN is valid and has proper permissions
3. Check MetaAPI dashboard for any account limits or restrictions

## Complete Updated Code (v2 - Both Fixes Applied)

```typescript
// Supabase Edge Function: Connect MT5 Account via MetaAPI REST API
// Deno runtime - replaces Express POST /api/metaapi/connect

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const METAAPI_PROVISIONING_URL = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
const METAAPI_RPC_URL = 'https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai';

interface ConnectRequest {
  platform_type: 'mt4' | 'mt5';
  login_number: string;
  broker_server: string;
  investor_password: string;
  account_id: string;
  broker_name: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: No auth token', statusCode: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token by removing "Bearer " prefix
    const token = authHeader.replace('Bearer ', '');
    console.log('[metaapi-connect] Token extracted, length:', token.length);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { 
        headers: { 
          Authorization: `Bearer ${token}` 
        } 
      }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('[metaapi-connect] Auth check - User:', user?.id, 'Error:', authError?.message);
    
    if (authError || !user) {
      console.error('[metaapi-connect] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Invalid token', 
          details: authError?.message,
          statusCode: 401 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ConnectRequest = await req.json();
    const { platform_type, login_number, broker_server, investor_password, account_id, broker_name } = body;

    console.log('[metaapi-connect] Connect request from user:', user.id);
    console.log('[metaapi-connect] Platform:', platform_type, 'Login:', login_number, 'Server:', broker_server);

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('mt_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('login_number', login_number)
      .eq('broker_server', broker_server)
      .single();

    if (existingConnection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection already exists', statusCode: 409 }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get MetaAPI token
    const metaapiToken = Deno.env.get('METAAPI_TOKEN');
    if (!metaapiToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'MetaAPI token not configured', statusCode: 503 }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create MetaAPI account via REST API with minimal payload
    console.log('[metaapi-connect] Creating MetaAPI account...');
    const createAccountResponse = await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth-token': metaapiToken,
      },
      body: JSON.stringify({
        name: `${broker_name} - ${login_number}`,
        type: 'cloud',
        login: login_number,
        password: investor_password,
        server: broker_server,
        platform: platform_type,
      }),
    });

    if (!createAccountResponse.ok) {
      const errorText = await createAccountResponse.text();
      console.error('[metaapi-connect] Failed to create account:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create MetaAPI account: ${errorText}`, statusCode: 500 }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountData = await createAccountResponse.json();
    const metaApiAccountId = accountData.id;
    console.log('[metaapi-connect] MetaAPI account created:', metaApiAccountId);

    // Deploy account
    console.log('[metaapi-connect] Deploying account...');
    const deployResponse = await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts/${metaApiAccountId}/deploy`, {
      method: 'POST',
      headers: {
        'auth-token': metaapiToken,
      },
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      console.error('[metaapi-connect] Failed to deploy account:', errorText);
    }

    // Wait for deployment (max 60 seconds)
    console.log('[metaapi-connect] Waiting for deployment...');
    let deployed = false;
    let accountBalance = 0;
    let accountEquity = 0;
    let accountMargin = 0;

    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check account status
      const statusResponse = await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts/${metaApiAccountId}`, {
        method: 'GET',
        headers: {
          'auth-token': metaapiToken,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.connectionStatus === 'CONNECTED') {
          deployed = true;
          console.log('[metaapi-connect] Account deployed and connected!');
          
          // Get account info via RPC API
          try {
            const accountInfoResponse = await fetch(`${METAAPI_RPC_URL}/users/current/accounts/${metaApiAccountId}/rpc`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'auth-token': metaapiToken,
              },
              body: JSON.stringify({
                type: 'getAccountInformation',
              }),
            });

            if (accountInfoResponse.ok) {
              const accountInfo = await accountInfoResponse.json();
              accountBalance = accountInfo.balance || 0;
              accountEquity = accountInfo.equity || 0;
              accountMargin = accountInfo.margin || 0;
            }
          } catch (error) {
            console.warn('[metaapi-connect] Failed to get account info:', error);
          }
          
          break;
        }
      }
    }

    if (!deployed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to establish connection within 60 seconds', 
          statusCode: 500 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encrypt password (simple base64 for now)
    const encryptedPassword = btoa(investor_password);

    // Store in database
    const { data: connectionRecord, error: createError } = await supabase
      .from('mt_connections')
      .insert({
        user_id: user.id,
        account_id: account_id,
        platform_type: platform_type.toUpperCase(),
        login_number: login_number,
        broker_server: broker_server,
        investor_password_encrypted: encryptedPassword,
        connection_method: 'metaapi',
        connection_status: 'connected',
        metaapi_account_id: metaApiAccountId,
        account_balance: accountBalance,
        account_equity: accountEquity,
        account_margin: accountMargin,
        last_sync_time: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('[metaapi-connect] Database error:', createError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store connection', statusCode: 500, details: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create sync log
    await supabase
      .from('mt_sync_logs')
      .insert({
        connection_id: connectionRecord.id,
        sync_status: 'success',
        sync_type: 'initial',
        trades_synced: 0,
        sync_duration_ms: 0
      });

    console.log('[metaapi-connect] Connection successful!');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          connection_id: connectionRecord.id,
          metaapi_account_id: metaApiAccountId,
          platform_type: connectionRecord.platform_type,
          login_number: connectionRecord.login_number,
          broker_server: connectionRecord.broker_server,
          connection_status: 'connected',
          account_balance: accountBalance,
          account_equity: accountEquity
        },
        message: 'MT account connected successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[metaapi-connect] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        statusCode: 500, 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Summary
Both fixes have been applied:
1. **Authentication Fix**: Proper JWT token extraction by removing "Bearer " prefix
2. **Validation Fix**: Simplified MetaAPI account creation payload to only include essential fields

The function should now work correctly for connecting MT5 accounts via MetaAPI.