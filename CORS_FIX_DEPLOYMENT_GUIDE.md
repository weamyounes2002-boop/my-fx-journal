# MetaAPI Edge Functions - CORS Fix Deployment Guide

## 🔴 Critical Issue: CORS Preflight Failure

**Error Message:**
```
Access to fetch at 'https://mctcmjnirsxrywvwzpzu.supabase.co/functions/v1/metaapi-connect' 
from origin 'https://684732-7804edddf8f948b5b79fce2a84f2bdaf-3-latest.app.mgx.dev' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## 🎯 Root Cause

The Edge Functions deployed on Supabase still have **old code** that returns `'ok'` string instead of proper HTTP 200 status for OPTIONS requests. Your local files have the correct fix, but they need to be **redeployed** to take effect.

## ✅ Verification: Code is Correct

All 4 Edge Functions in your local repository have the correct CORS handling:

```typescript
// ✅ CORRECT (in your local files)
if (req.method === 'OPTIONS') {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders 
  });
}

// ❌ OLD (still deployed on Supabase)
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

**Files with correct code:**
- ✅ `/workspace/shadcn-ui/supabase/functions/metaapi-connect/index.ts`
- ✅ `/workspace/shadcn-ui/supabase/functions/metaapi-disconnect/index.ts`
- ✅ `/workspace/shadcn-ui/supabase/functions/metaapi-sync/index.ts`
- ✅ `/workspace/shadcn-ui/supabase/functions/metaapi-status/index.ts`

## 🚀 Solution: Redeploy All 4 Functions

### Method 1: Supabase CLI (Recommended)

```bash
cd /workspace/shadcn-ui

# Login to Supabase (if not already logged in)
supabase login

# Link to your project
supabase link --project-ref mctcmjnirsxrywvwzpzu

# Deploy all 4 functions
supabase functions deploy metaapi-connect
supabase functions deploy metaapi-disconnect
supabase functions deploy metaapi-sync
supabase functions deploy metaapi-status

# Verify deployment
supabase functions list
```

### Method 2: Supabase Dashboard (Alternative)

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com/project/mctcmjnirsxrywvwzpzu
   - Navigate to: **Edge Functions** (left sidebar)

2. **For EACH function** (`metaapi-connect`, `metaapi-disconnect`, `metaapi-sync`, `metaapi-status`):
   
   **Option A: Redeploy from Git (if connected)**
   - Click on the function name
   - Click **"Deploy"** or **"Redeploy"** button
   - Confirm deployment

   **Option B: Manual Update**
   - Click on the function name
   - Click **"Edit"** or **"Code"** tab
   - Copy the entire content from your local file
   - Paste into the editor
   - Click **"Deploy"** button

3. **Verify each deployment**
   - Check that deployment status shows "Deployed"
   - Look for green checkmark or "Active" status

### Method 3: Manual Copy-Paste (If CLI/Git unavailable)

For each function, copy the code from these local files:

#### 1. metaapi-connect
```bash
# Copy from:
/workspace/shadcn-ui/supabase/functions/metaapi-connect/index.ts

# Paste to:
Dashboard → Edge Functions → metaapi-connect → Edit → Deploy
```

#### 2. metaapi-disconnect
```bash
# Copy from:
/workspace/shadcn-ui/supabase/functions/metaapi-disconnect/index.ts

# Paste to:
Dashboard → Edge Functions → metaapi-disconnect → Edit → Deploy
```

#### 3. metaapi-sync
```bash
# Copy from:
/workspace/shadcn-ui/supabase/functions/metaapi-sync/index.ts

# Paste to:
Dashboard → Edge Functions → metaapi-sync → Edit → Deploy
```

#### 4. metaapi-status
```bash
# Copy from:
/workspace/shadcn-ui/supabase/functions/metaapi-status/index.ts

# Paste to:
Dashboard → Edge Functions → metaapi-status → Edit → Deploy
```

## 🧪 Verify the Fix

### Test 1: CORS Preflight Request

```bash
# Test OPTIONS request (should return 200)
curl -X OPTIONS \
  https://mctcmjnirsxrywvwzpzu.supabase.co/functions/v1/metaapi-connect \
  -H "Origin: https://684732-7804edddf8f948b5b79fce2a84f2bdaf-3-latest.app.mgx.dev" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -v
```

**Expected Response:**
```
< HTTP/2 200 OK
< access-control-allow-origin: *
< access-control-allow-headers: authorization, x-client-info, apikey, content-type
< access-control-allow-methods: POST, OPTIONS
```

### Test 2: Browser Console

After redeploying:
1. Clear browser cache: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Go to Accounts page
3. Try connecting MT5 account
4. Check browser console - CORS error should be **gone**

### Test 3: Check Deployment Logs

In Supabase Dashboard:
1. Go to **Edge Functions** → Select function
2. Click **"Logs"** tab
3. Look for recent deployment entries
4. Verify no CORS-related errors

## 🔧 Troubleshooting

### Issue 1: "supabase command not found"

**Solution:**
```bash
# Install Supabase CLI
npm install -g supabase

# Or use npx
npx supabase login
npx supabase functions deploy metaapi-connect
```

### Issue 2: "Project not linked"

**Solution:**
```bash
supabase link --project-ref mctcmjnirsxrywvwzpzu
```

### Issue 3: CORS error persists after deployment

**Checklist:**
- [ ] All 4 functions redeployed?
- [ ] Browser cache cleared? (Hard refresh: Ctrl+Shift+R)
- [ ] Deployment successful? (Check Supabase Dashboard logs)
- [ ] Correct CORS headers in deployed code? (Verify in Dashboard)

**If still failing:**
1. Check Edge Function logs in Supabase Dashboard
2. Verify environment variables are set:
   - `METAAPI_TOKEN` - Your MetaAPI token
   - `SUPABASE_URL` - Auto-set
   - `SUPABASE_ANON_KEY` - Auto-set

### Issue 4: "MetaAPI token not configured"

**Solution:**
1. Go to Supabase Dashboard → **Settings** → **Edge Functions**
2. Add secret: `METAAPI_TOKEN` = `your_metaapi_token_here`
3. Redeploy functions after adding the secret

### Issue 5: Deployment succeeds but function returns HTML

**Cause:** Function not properly deployed or wrong endpoint

**Solution:**
1. Verify function URL format:
   ```
   https://mctcmjnirsxrywvwzpzu.supabase.co/functions/v1/metaapi-connect
   ```
2. Check function exists in Dashboard
3. Redeploy with `--no-verify-jwt` flag if needed:
   ```bash
   supabase functions deploy metaapi-connect --no-verify-jwt
   ```

## 📋 Deployment Checklist

- [ ] **Step 1:** Verify local code has correct CORS fix (✅ Already verified)
- [ ] **Step 2:** Choose deployment method (CLI, Dashboard, or Manual)
- [ ] **Step 3:** Deploy all 4 functions:
  - [ ] metaapi-connect
  - [ ] metaapi-disconnect
  - [ ] metaapi-sync
  - [ ] metaapi-status
- [ ] **Step 4:** Verify deployment in Supabase Dashboard
- [ ] **Step 5:** Clear browser cache (Ctrl+Shift+R)
- [ ] **Step 6:** Test CORS preflight with curl command
- [ ] **Step 7:** Test MT5 connection in browser
- [ ] **Step 8:** Verify no CORS errors in browser console

## 🎉 Success Indicators

After successful deployment, you should see:

1. **In Browser Console:**
   ```
   [MetaAPI Client] Connecting to: https://mctcmjnirsxrywvwzpzu.supabase.co/functions/v1/metaapi-connect
   [MetaAPI Client] Request: {platform_type: 'mt5', login_number: '5005404', ...}
   [MetaAPI Client] Response: {success: true, data: {...}}
   ```

2. **No CORS Errors:**
   - ❌ "blocked by CORS policy" - GONE
   - ✅ Clean network requests
   - ✅ Successful API responses

3. **In Supabase Logs:**
   ```
   [Edge Function] Connect request from user: xxx
   [Edge Function] Platform: mt5 Login: 5005404
   [Edge Function] Connection successful!
   ```

## 🔐 Environment Variables

Ensure these are set in Supabase Dashboard → Settings → Edge Functions:

| Variable | Required | Description |
|----------|----------|-------------|
| `METAAPI_TOKEN` | ✅ Yes | Your MetaAPI account token |
| `SUPABASE_URL` | ✅ Auto-set | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ Auto-set | Supabase anonymous key |

## 📚 Additional Resources

- **Supabase Edge Functions Docs:** https://supabase.com/docs/guides/functions
- **CORS in Edge Functions:** https://supabase.com/docs/guides/functions/cors
- **MetaAPI Documentation:** https://metaapi.cloud/docs/
- **Supabase CLI Reference:** https://supabase.com/docs/reference/cli

## 💡 Key Takeaways

1. **Local code is correct** - No code changes needed
2. **Deployment is required** - Changes don't take effect until redeployed
3. **All 4 functions must be redeployed** - Not just metaapi-connect
4. **Clear browser cache** - After deployment, always hard refresh
5. **Check logs** - Supabase Dashboard logs show deployment status

---

**Need Help?**
- Check Supabase Dashboard → Edge Functions → Logs
- Review browser console for detailed error messages
- Verify environment variables are set correctly
- Ensure MetaAPI token is valid and has proper permissions