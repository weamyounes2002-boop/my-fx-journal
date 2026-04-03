-- Add missing columns required by MetaAPI integration
-- Run this in Supabase SQL Editor to add columns needed for trade sync

BEGIN;

-- Add new columns to trades table
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS commission DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS swap DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS magic_number INTEGER DEFAULT 0;

-- Create unique constraint on external_id to prevent duplicate trades
ALTER TABLE trades 
ADD CONSTRAINT trades_external_id_unique UNIQUE (external_id);

-- Create index on external_id for faster duplicate checking
CREATE INDEX IF NOT EXISTS trades_external_id_idx ON trades(external_id);

-- Create index on platform for filtering
CREATE INDEX IF NOT EXISTS trades_platform_idx ON trades(platform);

COMMIT;