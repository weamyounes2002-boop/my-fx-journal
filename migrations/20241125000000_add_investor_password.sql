-- Add investor_password column to mt_connections table
-- This will store encrypted investor passwords for MetaAPI provisioning

ALTER TABLE public.mt_connections
ADD COLUMN IF NOT EXISTS investor_password_encrypted TEXT;

-- Add platform column to distinguish MT4 vs MT5
ALTER TABLE public.mt_connections
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'mt5' CHECK (platform IN ('mt4', 'mt5'));

-- Add comment to explain the columns
COMMENT ON COLUMN mt_connections.investor_password_encrypted IS 'Encrypted investor password for MetaAPI account provisioning. Used for read-only access to trading data.';
COMMENT ON COLUMN mt_connections.platform IS 'Trading platform type: mt4 or mt5';

-- Create index for platform
CREATE INDEX IF NOT EXISTS idx_mt_connections_platform ON public.mt_connections(platform);