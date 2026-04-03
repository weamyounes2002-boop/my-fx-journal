# How to Apply Database Migration to Fix "mt_accounts table not found" Error

## Problem
The error `"Could not find the table 'public.mt_accounts' in the schema cache"` means the database tables don't exist in your Supabase project yet.

## Solution: Apply the Migration SQL

### Step 1: Copy the Migration SQL
1. Open the file: `/workspace/shadcn-ui/supabase/migrations/20241120000000_complete_metaapi_schema.sql`
2. Copy **ALL** the SQL code (all 534 lines)

### Step 2: Run it in Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/mctcmjnirsxrywvwzpzu
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Paste the entire SQL migration code
5. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Verify the Tables Were Created
After running the migration, verify by running this query in the SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('mt_accounts', 'mt_connections', 'accounts', 'trades');
```

You should see all 4 tables listed.

### Step 4: Test MT5 Connection Again
1. Go back to your app
2. Try connecting your MT5 account again
3. It should now work! ✅

## What This Migration Creates
- ✅ `profiles` table (user profiles)
- ✅ `accounts` table (trading accounts)
- ✅ `trades` table (trade history)
- ✅ `strategies` table (trading strategies)
- ✅ `goals` table (user goals)
- ✅ `trading_rules` table (trading rules)
- ✅ `mt_connections` table (MetaTrader connections)
- ✅ `mt_sync_logs` table (sync history)
- ✅ All necessary indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Triggers for automatic timestamp updates

## Note
There's also a second migration file `20241120000001_fix_metaapi_columns.sql` that you should run AFTER the first one if you encounter any column-related errors.