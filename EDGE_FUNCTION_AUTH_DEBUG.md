# Edge Function Authentication Debug Enhancement

## Problem
All three Edge Functions (`metaapi-fetch-history`, `metaapi-account-metrics`, `metaapi-open-positions`) were returning generic "Unauthorized" errors without details about why authentication was failing.

## Solution Applied

Enhanced all three Edge Functions with detailed authentication error logging to capture the exact error from `supabaseClient.auth.getUser()`.

### Changes Made

**Modified Files:**
1. `/workspace/shadcn-ui/supabase/functions/metaapi-fetch-history/index.ts`
2. `/workspace/shadcn-ui/supabase/functions/metaapi-account-metrics/index.ts`
3. `/workspace/shadcn-ui/supabase/functions/metaapi-open-positions/index.ts`

**Before (Lines 29-40):**
```typescript
const {
  data: { user },
} = await supabaseClient.auth.getUser();

if (!user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**After (Enhanced with error capture):**
```typescript
const authHeader = req.headers.get('Authorization');
console.log('[Function Name] Authorization header:', authHeader?.substring(0, 50) + '...');

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      headers: { Authorization: authHeader! },
    },
  }
);

const {
  data: { user },
  error: authError,
} = await supabaseClient.auth.getUser();

if (authError) {
  console.error('[Function Name] Auth error:', authError);
  return new Response(JSON.stringify({ 
    error: 'Authentication failed', 
    details: authError.message,
    code: authError.code,
  }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

if (!user) {
  console.error('[Function Name] No user returned from getUser()');
  return new Response(JSON.stringify({ error: 'Unauthorized - no user' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

console.log('[Function Name] User authenticated:', user.id);
```

## What This Reveals

The enhanced logging will now show:

1. **Authorization Header Preview**: First 50 characters of the Bearer token being sent
2. **Auth Error Details**: If `getUser()` fails, we'll see:
   - `authError.message` - Human-readable error description
   - `authError.code` - Error code (e.g., "invalid_jwt", "jwt_expired")
3. **User Authentication Success**: Logs the user ID when auth succeeds

## Expected Outcomes

### If Token is Invalid:
```json
{
  "error": "Authentication failed",
  "details": "JWT expired",
  "code": "jwt_expired"
}
```

### If Token is Malformed:
```json
{
  "error": "Authentication failed",
  "details": "Invalid JWT format",
  "code": "invalid_jwt"
}
```

### If No User Found:
```json
{
  "error": "Unauthorized - no user"
}
```

## Next Steps

1. **Deploy the Edge Functions** to Supabase:
   ```bash
   cd /workspace/shadcn-ui
   supabase functions deploy metaapi-fetch-history
   supabase functions deploy metaapi-account-metrics
   supabase functions deploy metaapi-open-positions
   ```

2. **Test the sync again** and check:
   - Browser console logs (client-side token info)
   - Supabase Edge Function logs (server-side auth errors)

3. **Analyze the error details** to determine:
   - Is the token expired? (jwt_expired)
   - Is the token format invalid? (invalid_jwt)
   - Is there a mismatch between token and project? (invalid_token)
   - Is the token being corrupted during transmission?

## Common Auth Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `jwt_expired` | Token has expired | Refresh token before request |
| `invalid_jwt` | Token format is wrong | Check token structure (3 parts) |
| `invalid_token` | Token doesn't match project | Verify SUPABASE_URL and project |
| `user_not_found` | User doesn't exist | Check user session |

## Deployment Required

⚠️ **IMPORTANT**: These changes to Edge Functions require deployment to take effect. The functions need to be redeployed to Supabase before the enhanced error logging will work.

```bash
supabase functions deploy metaapi-fetch-history
supabase functions deploy metaapi-account-metrics  
supabase functions deploy metaapi-open-positions
```

After deployment, run the historical data sync again to see the detailed authentication error messages.