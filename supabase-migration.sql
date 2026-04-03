-- Migration Script for Existing Databases
-- Run this SQL in your Supabase SQL Editor if you already have the trades table

BEGIN;

-- Add new columns to trades table
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS stop_loss DECIMAL(15, 5),
ADD COLUMN IF NOT EXISTS take_profit DECIMAL(15, 5),
ADD COLUMN IF NOT EXISTS exit_type TEXT CHECK (exit_type IN ('stop_loss', 'take_profit', 'manual', 'trailing_stop'));

-- Add comments for new fields
COMMENT ON COLUMN trades.stop_loss IS 'Stop loss price level';
COMMENT ON COLUMN trades.take_profit IS 'Take profit price level';
COMMENT ON COLUMN trades.exit_type IS 'How the trade was closed: stop_loss, take_profit, manual, trailing_stop';

-- Create index for exit_type for better query performance
CREATE INDEX IF NOT EXISTS trades_exit_type_idx ON trades(exit_type);

COMMIT;