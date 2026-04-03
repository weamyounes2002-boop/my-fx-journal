-- Add currency column to accounts table
-- This migration adds support for storing account currency information
-- Run this SQL in your Supabase SQL Editor to fix the 400 Bad Request error

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD' NOT NULL;

-- Add a comment to the column for documentation
COMMENT ON COLUMN accounts.currency IS 'Account currency code (e.g., USD, EUR, GBP)';