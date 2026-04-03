-- ============================================================================
-- CREATE METAAPI INTEGRATION TABLES FROM SCRATCH
-- This migration creates all necessary tables for MetaAPI integration
-- Safe to run on a fresh database
-- ============================================================================

-- ============================================================================
-- CREATE MT_CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mt_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  login TEXT NOT NULL,
  server TEXT NOT NULL,
  broker TEXT,
  nickname TEXT,
  metaapi_account_id TEXT UNIQUE,
  metaapi_deployed_at TIMESTAMP WITH TIME ZONE,
  connection_method TEXT DEFAULT 'metaapi' CHECK (connection_method IN ('ea', 'metaapi')),
  connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  account_balance DECIMAL(15, 2) DEFAULT 0,
  account_equity DECIMAL(15, 2) DEFAULT 0,
  account_margin DECIMAL(15, 2) DEFAULT 0,
  last_sync_time TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE MT_SYNC_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mt_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.mt_connections(id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'error', 'pending')),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('initial', 'full', 'incremental')),
  trades_synced INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADD METAAPI COLUMNS TO TRADES TABLE (IF IT EXISTS)
-- ============================================================================

DO $$ 
BEGIN
  -- Only add columns if trades table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'trades'
  ) THEN
    
    -- Add ticket column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'ticket'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN ticket TEXT;
    END IF;

    -- Add external_id column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'external_id'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN external_id TEXT;
    END IF;

    -- Add magic_number column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'magic_number'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN magic_number INTEGER;
    END IF;

    -- Add platform column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'platform'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN platform TEXT DEFAULT 'mt5';
    END IF;

    -- Add type column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'type'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN type TEXT;
    END IF;

    -- Add lots column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'lots'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN lots DECIMAL(15, 5);
    END IF;

    -- Add open_price column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'open_price'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN open_price DECIMAL(15, 5);
    END IF;

    -- Add close_price column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'close_price'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN close_price DECIMAL(15, 5);
    END IF;

    -- Add open_time column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'open_time'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN open_time TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add close_time column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'close_time'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN close_time TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add commission column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'commission'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN commission DECIMAL(15, 2);
    END IF;

    -- Add swap column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'swap'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN swap DECIMAL(15, 2);
    END IF;

    -- Add comment column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'comment'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN comment TEXT;
    END IF;

    -- Add unique constraint on ticket and user_id if not exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'trades_ticket_user_id_key'
    ) THEN
      ALTER TABLE public.trades 
      ADD CONSTRAINT trades_ticket_user_id_key 
      UNIQUE (ticket, user_id);
    END IF;

  END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- MT Connections indexes
CREATE INDEX IF NOT EXISTS idx_mt_connections_user_id ON public.mt_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_connections_account_id ON public.mt_connections(account_id);
CREATE INDEX IF NOT EXISTS idx_mt_connections_metaapi_account_id ON public.mt_connections(metaapi_account_id);
CREATE INDEX IF NOT EXISTS idx_mt_connections_status ON public.mt_connections(connection_status);

-- MT Sync Logs indexes
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_connection_id ON public.mt_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_synced_at ON public.mt_sync_logs(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_status ON public.mt_sync_logs(sync_status);

-- Trades indexes for MetaAPI columns (only if trades table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'trades'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_trades_ticket ON public.trades(ticket);
    CREATE INDEX IF NOT EXISTS idx_trades_external_id ON public.trades(external_id);
    CREATE INDEX IF NOT EXISTS idx_trades_platform ON public.trades(platform);
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE public.mt_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_sync_logs ENABLE ROW LEVEL SECURITY;

-- MT Connections policies
DROP POLICY IF EXISTS "Users can view own mt connections" ON public.mt_connections;
CREATE POLICY "Users can view own mt connections" ON public.mt_connections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mt connections" ON public.mt_connections;
CREATE POLICY "Users can insert own mt connections" ON public.mt_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mt connections" ON public.mt_connections;
CREATE POLICY "Users can update own mt connections" ON public.mt_connections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own mt connections" ON public.mt_connections;
CREATE POLICY "Users can delete own mt connections" ON public.mt_connections
  FOR DELETE USING (auth.uid() = user_id);

-- MT Sync Logs policies
DROP POLICY IF EXISTS "Users can view own sync logs" ON public.mt_sync_logs;
CREATE POLICY "Users can view own sync logs" ON public.mt_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mt_connections
      WHERE mt_connections.id = mt_sync_logs.connection_id
      AND mt_connections.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own sync logs" ON public.mt_sync_logs;
CREATE POLICY "Users can insert own sync logs" ON public.mt_sync_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mt_connections
      WHERE mt_connections.id = mt_sync_logs.connection_id
      AND mt_connections.user_id = auth.uid()
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.mt_connections TO authenticated;
GRANT ALL ON public.mt_sync_logs TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'MetaAPI tables created successfully!';
  RAISE NOTICE 'Tables created: mt_connections, mt_sync_logs';
  RAISE NOTICE 'Indexes and RLS policies applied';
END $$;
