-- Simple migration to create mt_accounts table
-- This matches what the Edge Function expects

-- Create mt_accounts table
CREATE TABLE IF NOT EXISTS public.mt_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_type TEXT NOT NULL,
  login_number TEXT NOT NULL,
  broker_server TEXT NOT NULL,
  broker_name TEXT,
  metaapi_account_id TEXT UNIQUE,
  connection_status TEXT DEFAULT 'disconnected',
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, login_number, broker_server)
);

-- Enable RLS
ALTER TABLE public.mt_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own mt accounts" ON public.mt_accounts;
CREATE POLICY "Users can view own mt accounts" ON public.mt_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mt accounts" ON public.mt_accounts;
CREATE POLICY "Users can insert own mt accounts" ON public.mt_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mt accounts" ON public.mt_accounts;
CREATE POLICY "Users can update own mt accounts" ON public.mt_accounts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own mt accounts" ON public.mt_accounts;
CREATE POLICY "Users can delete own mt accounts" ON public.mt_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_mt_accounts_user_id ON public.mt_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_accounts_metaapi_account_id ON public.mt_accounts(metaapi_account_id);

-- Grant permissions
GRANT ALL ON public.mt_accounts TO authenticated;