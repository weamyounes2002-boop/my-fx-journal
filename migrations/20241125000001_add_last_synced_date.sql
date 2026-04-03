-- Add last_synced_date column to mt_connections table
-- This tracks when the account was last synced with MetaAPI

ALTER TABLE public.mt_connections
ADD COLUMN IF NOT EXISTS last_synced_date TIMESTAMPTZ;

-- Add comment to explain the column
COMMENT ON COLUMN mt_connections.last_synced_date IS 'Timestamp of the last successful data sync with MetaAPI';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_mt_connections_last_synced ON public.mt_connections(last_synced_date);