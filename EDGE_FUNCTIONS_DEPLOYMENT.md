# Edge Functions Deployment Guide

## ✅ CORS is Already Configured

Good news! All 4 Edge Functions already have proper CORS headers configured:
- `metaapi-connect`
- `metaapi-disconnect`
- `metaapi-sync`
- `metaapi-status`

## 🚀 Deploy the Functions to Supabase

The functions exist in your code but need to be deployed to Supabase servers.

### Step 1: Install Supabase CLI (if not installed)

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate.

### Step 3: Link Your Project

```bash
cd /workspace/shadcn-ui
supabase link --project-ref mctcmjnirsxrywvwzpzu
```

Replace `mctcmjnirsxrywvwzpzu` with your actual Supabase project reference (it's in your Supabase URL).

### Step 4: Deploy All Functions

```bash
supabase functions deploy metaapi-connect
supabase functions deploy metaapi-disconnect
supabase functions deploy metaapi-sync
supabase functions deploy metaapi-status
```

Or deploy all at once:

```bash
supabase functions deploy
```

### Step 5: Verify Deployment

After deployment, you should see output like:

```
✓ Deployed Function metaapi-connect on project mctcmjnirsxrywvwzpzu
  URL: https://mctcmjnirsxrywvwzpzu.supabase.co/functions/v1/metaapi-connect
```

### Step 6: Test the Connection

Go back to your application and try connecting your MT4/MT5 account again. The CORS error should be resolved!

## 🔍 Troubleshooting

### If you see "command not found: supabase"

Install the CLI globally:
```bash
npm install -g supabase
```

### If deployment fails with "Not logged in"

Run:
```bash
supabase login
```

### If you see "Project not linked"

Make sure you're in the correct directory and run:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Check Function Logs

To see what's happening in your functions:
```bash
supabase functions logs metaapi-connect --tail
```

## 📋 Quick Checklist

- [ ] Supabase CLI installed
- [ ] Logged into Supabase
- [ ] Project linked
- [ ] All 4 functions deployed
- [ ] METAAPI_TOKEN secret set in Supabase
- [ ] Test connection from your app

## 🎯 What You Already Have

✅ Database migration completed (all tables and columns created)
✅ CORS headers configured in all Edge Functions
✅ Edge Function code ready in `/workspace/shadcn-ui/supabase/functions/`
✅ METAAPI_TOKEN visible in Supabase secrets section

## 🚦 Next Step

**Deploy the functions using the commands above, then test your MT4/MT5 connection!**