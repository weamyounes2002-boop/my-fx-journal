# Supabase Edge Functions Deployment Guide

## 📋 Overview

The TradeMind application has been migrated from Express backend to **Supabase Edge Functions** to enable deployment on MGX App Viewer. Edge Functions are serverless functions that run on Supabase's infrastructure.

---

## 🏗️ Architecture

### Before (Express Backend)
```
Frontend (MGX) → ❌ Cannot reach → Express Server (localhost:3001)
```

### After (Supabase Edge Functions)
```
Frontend (MGX) → ✅ Direct HTTPS → Supabase Edge Functions
```

---

## 📁 Edge Functions Created

All functions are located in `/workspace/shadcn-ui/supabase/functions/`:

| Function | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **metaapi-connect** | `/functions/v1/metaapi-connect` | POST | Connect MT5 account via MetaAPI |
| **metaapi-sync** | `/functions/v1/metaapi-sync/:id` | POST | Sync trades from MT5 to database |
| **metaapi-disconnect** | `/functions/v1/metaapi-disconnect/:id` | DELETE | Disconnect MT5 account |
| **metaapi-status** | `/functions/v1/metaapi-status/:id` | GET | Get connection status |

---

## 🚀 Deployment Steps

### Prerequisites

1. **Install Supabase CLI**
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # Windows (via Scoop)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   
   # Linux
   brew install supabase/tap/supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```
   This will open a browser window for authentication.

3. **Link to Your Project**
   ```bash
   cd /workspace/shadcn-ui
   supabase link --project-ref mctcmjnirsxrywvwzpzu
   ```
   Use your Supabase project reference ID (found in project settings).

---

### Deploy Edge Functions

```bash
cd /workspace/shadcn-ui

# Deploy all functions at once
supabase functions deploy metaapi-connect
supabase functions deploy metaapi-sync
supabase functions deploy metaapi-disconnect
supabase functions deploy metaapi-status
```

**Or deploy all at once:**
```bash
supabase functions deploy
```

---

### Set Environment Variables

Edge Functions need access to environment variables. Set them in Supabase Dashboard or via CLI:

```bash
# Set MetaAPI token
supabase secrets set METAAPI_TOKEN=your_metaapi_token_here

# Verify secrets are set
supabase secrets list
```

**Required secrets:**
- `METAAPI_TOKEN` - Your MetaAPI API token
- `SUPABASE_URL` - Automatically available
- `SUPABASE_ANON_KEY` - Automatically available

---

## 🧪 Testing Edge Functions

### Test Locally (Before Deployment)

```bash
# Start Supabase local development
supabase start

# Serve functions locally
supabase functions serve metaapi-connect --env-file .env

# Test with curl
curl -X POST http://localhost:54321/functions/v1/metaapi-connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{
    "platform_type": "mt5",
    "login_number": "12345",
    "broker_server": "ICMarkets-Demo",
    "investor_password": "test123",
    "account_id": "test-account-id",
    "broker_name": "IC Markets"
  }'
```

### Test Deployed Functions

```bash
# Get your Supabase URL and anon key from .env
SUPABASE_URL="https://mctcmjnirsxrywvwzpzu.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"

# Test connect function
curl -X POST ${SUPABASE_URL}/functions/v1/metaapi-connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "platform_type": "mt5",
    "login_number": "12345",
    "broker_server": "ICMarkets-Demo",
    "investor_password": "test123",
    "account_id": "test-account-id",
    "broker_name": "IC Markets"
  }'
```

---

## 🔧 Frontend Changes

The frontend has been updated to call Edge Functions instead of Express backend:

**Before:**
```typescript
const API_BASE = '/api/metaapi';  // Proxied to localhost:3001
```

**After:**
```typescript
const getEdgeFunctionUrl = (functionName: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${functionName}`;
};
```

**No changes needed in your `.env` file** - the frontend automatically uses `VITE_SUPABASE_URL`.

---

## 📊 Monitoring & Logs

### View Function Logs

```bash
# View logs for a specific function
supabase functions logs metaapi-connect

# Follow logs in real-time
supabase functions logs metaapi-connect --follow
```

### Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Edge Functions** in the sidebar
4. View deployment status, logs, and metrics

---

## 🐛 Troubleshooting

### Error: "Edge Function may not be deployed"

**Symptoms:**
```
Server returned HTML instead of JSON (405). Edge Function may not be deployed.
```

**Solution:**
1. Verify functions are deployed:
   ```bash
   supabase functions list
   ```

2. Check function logs:
   ```bash
   supabase functions logs metaapi-connect
   ```

3. Redeploy if needed:
   ```bash
   supabase functions deploy metaapi-connect
   ```

---

### Error: "MetaAPI token not configured"

**Symptoms:**
```json
{
  "success": false,
  "error": "MetaAPI token not configured",
  "statusCode": 503
}
```

**Solution:**
Set the MetaAPI token secret:
```bash
supabase secrets set METAAPI_TOKEN=your_token_here
```

---

### Error: "Unauthorized: Invalid token"

**Symptoms:**
```json
{
  "success": false,
  "error": "Unauthorized: Invalid token",
  "statusCode": 401
}
```

**Solution:**
1. Make sure user is signed in to Supabase
2. Check that `Authorization` header contains valid JWT
3. Verify JWT hasn't expired (refresh session if needed)

---

### CORS Errors

**Symptoms:**
```
Access to fetch at 'https://...supabase.co/functions/v1/...' from origin 'https://...mgx.dev' has been blocked by CORS policy
```

**Solution:**
Edge Functions already include CORS headers. If you still see this error:

1. Check that CORS headers are present in function response:
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   };
   ```

2. Ensure OPTIONS requests are handled:
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
   ```

---

## 🔐 Security Considerations

### Authentication
- All Edge Functions verify JWT tokens using `supabase.auth.getUser()`
- Only authenticated users can access functions
- User ID is validated against database records

### Secrets Management
- MetaAPI token stored as Supabase secret (not in code)
- Investor passwords encrypted before storage
- Database queries filtered by `user_id`

### CORS
- Currently set to `'*'` (allow all origins)
- Consider restricting to specific domains in production:
  ```typescript
  'Access-Control-Allow-Origin': 'https://your-domain.com'
  ```

---

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Runtime Documentation](https://deno.land/manual)
- [MetaAPI SDK Documentation](https://metaapi.cloud/docs/client/)

---

## ✅ Deployment Checklist

Before going live, verify:

- [ ] All 4 Edge Functions deployed successfully
- [ ] `METAAPI_TOKEN` secret is set
- [ ] Functions are accessible from MGX App Viewer
- [ ] Authentication works correctly
- [ ] MT5 connection can be established
- [ ] Trades sync successfully
- [ ] Error handling works as expected
- [ ] Logs show no critical errors

---

## 🎉 Success!

Once deployed, your TradeMind application will work seamlessly on MGX App Viewer without needing a separate Express backend server!

**Test it:**
1. Open your app on MGX App Viewer
2. Sign in with Supabase Auth
3. Try connecting an MT5 account
4. Verify trades sync correctly

---

**Last Updated:** 2025-01-18