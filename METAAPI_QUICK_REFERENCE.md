# MetaAPI Integration - Quick Reference

Quick reference for common MetaAPI integration commands and operations.

## 🚀 Quick Start

```bash
# 1. Run database migration
# Copy SQL file contents to Supabase SQL Editor and run

# 2. Deploy Edge Functions
supabase functions deploy metaapi-connect
supabase functions deploy metaapi-disconnect
supabase functions deploy metaapi-sync
supabase functions deploy metaapi-status

# 3. Set MetaAPI token
supabase secrets set METAAPI_TOKEN=your_token_here

# 4. Verify deployment
supabase functions list
supabase secrets list
```

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `mt_connections` | Stores MT4/MT5 connection details |
| `mt_sync_logs` | Tracks synchronization history |
| `trades` | Stores all trading history |
| `accounts` | User trading accounts |
| `profiles` | User profile information |

## 🔧 Common Commands

### Deployment

```bash
# Deploy all functions at once
supabase functions deploy metaapi-connect && \
supabase functions deploy metaapi-disconnect && \
supabase functions deploy metaapi-sync && \
supabase functions deploy metaapi-status

# Deploy with specific region
supabase functions deploy metaapi-connect --region us-east-1
```

### Secrets Management

```bash
# Set secret
supabase secrets set METAAPI_TOKEN=your_token

# List all secrets (won't show values)
supabase secrets list

# Delete a secret
supabase secrets unset METAAPI_TOKEN
```

### Logs and Monitoring

```bash
# View recent logs
supabase functions logs metaapi-connect --limit 50

# View logs in real-time
supabase functions logs metaapi-sync --tail

# View logs from last hour
supabase functions logs metaapi-status --since 1h
```

### Database Operations

```sql
-- Check connection status
SELECT 
  login_number,
  broker_server,
  connection_status,
  last_sync_time
FROM mt_connections
WHERE user_id = auth.uid();

-- View recent sync logs
SELECT 
  sync_status,
  trades_synced,
  error_message,
  synced_at
FROM mt_sync_logs
ORDER BY synced_at DESC
LIMIT 10;

-- Count trades by status
SELECT 
  status,
  COUNT(*) as count
FROM trades
WHERE user_id = auth.uid()
GROUP BY status;
```

## 🐛 Troubleshooting

### Connection Issues

```sql
-- Reset connection status
UPDATE mt_connections 
SET 
  connection_status = 'disconnected',
  error_message = NULL
WHERE id = 'connection-id';
```

### Check Edge Function Status

```bash
# Test function is responding
curl -X POST \
  'https://your-project.supabase.co/functions/v1/metaapi-status' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### Verify RLS Policies

```sql
-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('mt_connections', 'mt_sync_logs', 'trades');
```

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `METAAPI_TOKEN` | Yes | Your MetaAPI API token |
| `METAAPI_TIMEOUT` | No | Request timeout (default: 60000ms) |
| `METAAPI_REGION` | No | MetaAPI region (default: new-york) |

## 🔐 Security Checklist

- [ ] RLS enabled on all tables
- [ ] METAAPI_TOKEN set as secret (not in code)
- [ ] User authentication required for all operations
- [ ] Investor passwords encrypted before storage
- [ ] CORS configured correctly
- [ ] Rate limiting implemented

## 📈 Performance Tips

1. **Optimize Sync Frequency**
   - Don't sync more than once per minute
   - Use incremental sync for large histories

2. **Database Indexes**
   - All critical indexes are created by migration
   - Monitor query performance in Supabase dashboard

3. **Edge Function Optimization**
   - Functions timeout after 60 seconds by default
   - Use batch operations for multiple trades
   - Implement retry logic for failed requests

## 🔄 Update Procedures

### Update Edge Function

```bash
# Make changes to function code
# Then redeploy
supabase functions deploy metaapi-connect
```

### Update Database Schema

```bash
# Create new migration file
supabase migration new add_new_column

# Edit the migration file
# Then apply
supabase db push
```

### Update Secrets

```bash
# Update existing secret
supabase secrets set METAAPI_TOKEN=new_token

# Restart functions to pick up new secret
supabase functions deploy metaapi-connect
```

## 📞 Support Resources

- **MetaAPI Docs**: https://metaapi.cloud/docs
- **Supabase Docs**: https://supabase.com/docs
- **Edge Functions**: https://supabase.com/docs/guides/functions

## 🎯 Testing Checklist

- [ ] Database migration completed successfully
- [ ] All 4 Edge Functions deployed
- [ ] METAAPI_TOKEN secret set
- [ ] RLS policies working correctly
- [ ] Can connect MT4/MT5 account
- [ ] Trades sync successfully
- [ ] Account balance updates
- [ ] Sync logs created
- [ ] Error handling works
- [ ] User can disconnect account

---

**Last Updated**: 2024-11-20