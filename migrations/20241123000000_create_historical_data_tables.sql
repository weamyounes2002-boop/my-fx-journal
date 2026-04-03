-- ============================================================================
-- CREATE HISTORICAL DATA TABLES FOR METAAPI INTEGRATION
-- This migration creates tables for storing trading history, account metrics,
-- and open positions from MetaAPI
-- ============================================================================

-- ============================================================================
-- CREATE TRADES_HISTORY TABLE (for closed trades from MetaAPI)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trades_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- Trade identification
  ticket TEXT NOT NULL,
  external_id TEXT,
  magic_number INTEGER,
  
  -- Trade details
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL, -- 'buy' or 'sell'
  volume DECIMAL(15, 5) NOT NULL,
  
  -- Prices
  open_price DECIMAL(15, 5) NOT NULL,
  close_price DECIMAL(15, 5),
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  
  -- Times
  open_time TIMESTAMP WITH TIME ZONE NOT NULL,
  close_time TIMESTAMP WITH TIME ZONE,
  broker_time TEXT,
  
  -- Financial
  profit DECIMAL(15, 2),
  swap DECIMAL(15, 2),
  commission DECIMAL(15, 2),
  
  -- Metadata
  comment TEXT,
  state TEXT, -- 'open', 'closed', 'pending'
  platform TEXT DEFAULT 'mt5',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate trades
  CONSTRAINT trades_history_ticket_account_unique UNIQUE (ticket, account_id)
);

-- ============================================================================
-- CREATE ACCOUNT_METRICS_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- Account metrics
  balance DECIMAL(15, 2) NOT NULL,
  equity DECIMAL(15, 2) NOT NULL,
  margin DECIMAL(15, 2),
  free_margin DECIMAL(15, 2),
  margin_level DECIMAL(10, 2),
  credit DECIMAL(15, 2),
  
  -- Timestamp
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE OPEN_POSITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.open_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- Position identification
  position_id TEXT NOT NULL,
  
  -- Position details
  symbol TEXT NOT NULL,
  position_type TEXT NOT NULL, -- 'buy' or 'sell'
  volume DECIMAL(15, 5) NOT NULL,
  
  -- Prices
  open_price DECIMAL(15, 5) NOT NULL,
  current_price DECIMAL(15, 5) NOT NULL,
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  
  -- Financial
  profit DECIMAL(15, 2) NOT NULL,
  swap DECIMAL(15, 2),
  commission DECIMAL(15, 2),
  
  -- Times
  open_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate positions
  CONSTRAINT open_positions_position_id_account_unique UNIQUE (position_id, account_id)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Trades History indexes
CREATE INDEX IF NOT EXISTS idx_trades_history_user_id ON public.trades_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_history_account_id ON public.trades_history(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_history_ticket ON public.trades_history(ticket);
CREATE INDEX IF NOT EXISTS idx_trades_history_symbol ON public.trades_history(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_history_open_time ON public.trades_history(open_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_history_close_time ON public.trades_history(close_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_history_state ON public.trades_history(state);
CREATE INDEX IF NOT EXISTS idx_trades_history_synced_at ON public.trades_history(synced_at DESC);

-- Account Metrics History indexes
CREATE INDEX IF NOT EXISTS idx_account_metrics_user_id ON public.account_metrics_history(user_id);
CREATE INDEX IF NOT EXISTS idx_account_metrics_account_id ON public.account_metrics_history(account_id);
CREATE INDEX IF NOT EXISTS idx_account_metrics_recorded_at ON public.account_metrics_history(recorded_at DESC);

-- Open Positions indexes
CREATE INDEX IF NOT EXISTS idx_open_positions_user_id ON public.open_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_open_positions_account_id ON public.open_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_open_positions_position_id ON public.open_positions(position_id);
CREATE INDEX IF NOT EXISTS idx_open_positions_symbol ON public.open_positions(symbol);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE public.trades_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;

-- Trades History policies
DROP POLICY IF EXISTS "Users can view own trades history" ON public.trades_history;
CREATE POLICY "Users can view own trades history" ON public.trades_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trades history" ON public.trades_history;
CREATE POLICY "Users can insert own trades history" ON public.trades_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trades history" ON public.trades_history;
CREATE POLICY "Users can update own trades history" ON public.trades_history
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trades history" ON public.trades_history;
CREATE POLICY "Users can delete own trades history" ON public.trades_history
  FOR DELETE USING (auth.uid() = user_id);

-- Account Metrics History policies
DROP POLICY IF EXISTS "Users can view own account metrics" ON public.account_metrics_history;
CREATE POLICY "Users can view own account metrics" ON public.account_metrics_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own account metrics" ON public.account_metrics_history;
CREATE POLICY "Users can insert own account metrics" ON public.account_metrics_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Open Positions policies
DROP POLICY IF EXISTS "Users can view own open positions" ON public.open_positions;
CREATE POLICY "Users can view own open positions" ON public.open_positions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own open positions" ON public.open_positions;
CREATE POLICY "Users can insert own open positions" ON public.open_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own open positions" ON public.open_positions;
CREATE POLICY "Users can update own open positions" ON public.open_positions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own open positions" ON public.open_positions;
CREATE POLICY "Users can delete own open positions" ON public.open_positions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.trades_history TO authenticated;
GRANT ALL ON public.account_metrics_history TO authenticated;
GRANT ALL ON public.open_positions TO authenticated;

-- ============================================================================
-- CREATE FUNCTION TO UPDATE updated_at TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_trades_history_updated_at ON public.trades_history;
CREATE TRIGGER update_trades_history_updated_at
  BEFORE UPDATE ON public.trades_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_open_positions_updated_at ON public.open_positions;
CREATE TRIGGER update_open_positions_updated_at
  BEFORE UPDATE ON public.open_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Historical data tables created successfully!';
  RAISE NOTICE 'Tables created: trades_history, account_metrics_history, open_positions';
  RAISE NOTICE 'Indexes, RLS policies, and triggers applied';
END $$;