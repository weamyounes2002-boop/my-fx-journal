-- Add last_synced_date column to mt_connections table to track incremental syncs
ALTER TABLE mt_connections
ADD COLUMN IF NOT EXISTS last_synced_date TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the column
COMMENT ON COLUMN mt_connections.last_synced_date IS 'Timestamp of the last successful data sync from MetaAPI. Used for incremental syncing to minimize API costs.';