-- Supabase Referral System Schema
-- This file contains SQL commands to set up the referral system database tables

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'expired')) DEFAULT 'pending',
  earnings DECIMAL(10, 2) DEFAULT 0,
  commission_rate DECIMAL(5, 2) DEFAULT 10.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referrer_user_id, referred_user_id)
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('paypal', 'bank_transfer', 'crypto')),
  payment_details JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

-- Referral earnings table
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_earnings_referral ON referral_earnings(referral_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user ON referral_earnings(user_id);

-- Comments
COMMENT ON TABLE referrals IS 'Stores referral relationships between users';
COMMENT ON TABLE withdrawals IS 'Stores withdrawal requests from users';
COMMENT ON TABLE referral_earnings IS 'Tracks earnings from each referral';

COMMENT ON COLUMN referrals.referrer_user_id IS 'User who owns the referral code';
COMMENT ON COLUMN referrals.referred_user_id IS 'User who signed up with the referral code (NULL for the referrer own code)';
COMMENT ON COLUMN referrals.referral_code IS 'Unique referral code';
COMMENT ON COLUMN referrals.status IS 'Referral status: pending, active, completed, expired';
COMMENT ON COLUMN referrals.earnings IS 'Total earnings from this referral';
COMMENT ON COLUMN referrals.commission_rate IS 'Commission rate percentage (default 10%)';

COMMENT ON COLUMN withdrawals.amount IS 'Withdrawal amount in USD';
COMMENT ON COLUMN withdrawals.method IS 'Payment method: paypal, bank_transfer, crypto';
COMMENT ON COLUMN withdrawals.payment_details IS 'Payment details stored as JSON';
COMMENT ON COLUMN withdrawals.status IS 'Withdrawal status: pending, processing, completed, rejected';

-- RLS Policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

-- Referrals policies
CREATE POLICY "Users can view their own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users can create referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_user_id);

CREATE POLICY "Users can update their own referrals" ON referrals
  FOR UPDATE USING (auth.uid() = referrer_user_id);

-- Withdrawals policies
CREATE POLICY "Users can view their own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawal requests" ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Earnings policies
CREATE POLICY "Users can view their own earnings" ON referral_earnings
  FOR SELECT USING (auth.uid() = user_id);

-- Function to increment referral earnings
CREATE OR REPLACE FUNCTION increment_earnings(referral_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE referrals
  SET earnings = earnings + amount
  WHERE id = referral_id;
END;
$$ LANGUAGE plpgsql;

-- Note: Run this SQL in your Supabase SQL Editor to create the referral system tables