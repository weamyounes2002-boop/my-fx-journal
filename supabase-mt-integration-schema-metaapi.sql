-- Add MetaAPI columns to mt_connections table
ALTER TABLE mt_connections 
ADD COLUMN IF NOT EXISTS metaapi_account_id TEXT,
ADD COLUMN IF NOT EXISTS metaapi_deployed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS connection_method TEXT DEFAULT 'ea' CHECK (connection_method IN ('ea', 'metaapi'));

-- Create index on metaapi_account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_mt_connections_metaapi_account_id 
ON mt_connections(metaapi_account_id);

-- Add external_id column to trades table to track MetaAPI trade IDs
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS magic_number INTEGER,
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'mt5';

-- Create index on external_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_trades_external_id 
ON trades(external_id);

-- Create mt_sync_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS mt_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'error', 'pending')),
  trades_synced INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on connection_id and synced_at for faster queries
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_connection_id 
ON mt_sync_logs(connection_id);

CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_synced_at 
ON mt_sync_logs(synced_at DESC);

-- Add RLS policies for mt_sync_logs
ALTER TABLE mt_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sync logs
CREATE POLICY "Users can view own sync logs" ON mt_sync_logs
  FOR SELECT
  USING (
    connection_id IN (
      SELECT metaapi_account_id FROM mt_connections WHERE user_id = auth.uid()
    )
  );

-- Policy: System can insert sync logs
CREATE POLICY "System can insert sync logs" ON mt_sync_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment to explain the schema changes
COMMENT ON COLUMN mt_connections.metaapi_account_id IS 'MetaAPI account ID for cloud-based connections';
COMMENT ON COLUMN mt_connections.metaapi_deployed_at IS 'Timestamp when MetaAPI account was deployed';
COMMENT ON COLUMN mt_connections.connection_method IS 'Connection method: ea (Expert Advisor) or metaapi (Cloud Bridge)';
COMMENT ON COLUMN trades.external_id IS 'External trade ID from MetaAPI or MT4/MT5';
COMMENT ON COLUMN trades.magic_number IS 'Magic number used by EA or MetaAPI';
COMMENT ON COLUMN trades.platform IS 'Trading platform: mt4 or mt5';