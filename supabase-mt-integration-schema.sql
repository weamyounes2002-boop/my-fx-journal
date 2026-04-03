-- =====================================================
-- MT4/MT5 Integration Database Schema
-- =====================================================
-- This schema supports MetaTrader 4 and MetaTrader 5 integration
-- allowing users to connect their trading accounts via bridge service
-- =====================================================

-- Table: mt_connections
-- Purpose: Store MT4/MT5 connection credentials and status
-- Security: Investor passwords should be encrypted before storage
-- Note: Use AES-256 encryption with user-specific keys for investor_password_encrypted
CREATE TABLE IF NOT EXISTS mt_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
    
    -- Platform and connection details
    platform_type TEXT NOT NULL CHECK (platform_type IN ('MT4', 'MT5')),
    login_number TEXT NOT NULL, -- MT account login number
    broker_server TEXT NOT NULL, -- Broker server name (e.g., 'ICMarkets-Demo01')
    
    -- Security: Encrypted investor password
    -- IMPORTANT: Encrypt using AES-256 before storing
    -- Recommended approach: Use Supabase Vault or client-side encryption
    -- Never store plain text passwords
    investor_password_encrypted TEXT NOT NULL,
    
    -- Connection status tracking
    connection_status TEXT DEFAULT 'disconnected' CHECK (
        connection_status IN ('connected', 'disconnected', 'error', 'pending')
    ),
    last_sync_time TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    
    -- Account financial data (synced from MT platform)
    account_balance NUMERIC(15, 2) DEFAULT 0,
    account_equity NUMERIC(15, 2) DEFAULT 0,
    account_margin NUMERIC(15, 2) DEFAULT 0,
    account_free_margin NUMERIC(15, 2) DEFAULT 0,
    account_margin_level NUMERIC(10, 2) DEFAULT 0,
    
    -- Additional account info
    account_currency TEXT DEFAULT 'USD',
    account_leverage TEXT, -- e.g., '1:500'
    account_company TEXT, -- Broker company name
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    UNIQUE(user_id, login_number, broker_server) -- Prevent duplicate connections
);

-- Table: mt_sync_logs
-- Purpose: Track synchronization history and errors
CREATE TABLE IF NOT EXISTS mt_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID REFERENCES mt_connections(id) ON DELETE CASCADE NOT NULL,
    
    -- Sync status and results
    sync_status TEXT NOT NULL CHECK (
        sync_status IN ('success', 'failed', 'partial', 'in_progress')
    ),
    sync_type TEXT DEFAULT 'full' CHECK (
        sync_type IN ('full', 'incremental', 'manual')
    ),
    
    -- Sync statistics
    trades_synced INTEGER DEFAULT 0,
    trades_updated INTEGER DEFAULT 0,
    trades_failed INTEGER DEFAULT 0,
    positions_synced INTEGER DEFAULT 0,
    orders_synced INTEGER DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    error_code TEXT,
    
    -- Performance metrics
    sync_duration_ms INTEGER, -- Sync duration in milliseconds
    data_size_kb INTEGER, -- Size of synced data in KB
    
    -- Timestamps
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Indexes for performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table: mt_bridge_status
-- Purpose: Track bridge service health and availability
CREATE TABLE IF NOT EXISTS mt_bridge_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Bridge service info
    bridge_version TEXT,
    bridge_status TEXT DEFAULT 'offline' CHECK (
        bridge_status IN ('online', 'offline', 'error', 'maintenance')
    ),
    
    -- Connection details
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    ip_address TEXT,
    
    -- Statistics
    total_connections INTEGER DEFAULT 0,
    active_connections INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(user_id)
);

-- =====================================================
-- INDEXES for Performance Optimization
-- =====================================================

-- mt_connections indexes
CREATE INDEX IF NOT EXISTS idx_mt_connections_user_id ON mt_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_connections_account_id ON mt_connections(account_id);
CREATE INDEX IF NOT EXISTS idx_mt_connections_status ON mt_connections(connection_status);
CREATE INDEX IF NOT EXISTS idx_mt_connections_platform ON mt_connections(platform_type);
CREATE INDEX IF NOT EXISTS idx_mt_connections_last_sync ON mt_connections(last_sync_time DESC);

-- mt_sync_logs indexes
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_connection_id ON mt_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_status ON mt_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_synced_at ON mt_sync_logs(synced_at DESC);

-- mt_bridge_status indexes
CREATE INDEX IF NOT EXISTS idx_mt_bridge_status_user_id ON mt_bridge_status(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_bridge_status_heartbeat ON mt_bridge_status(last_heartbeat DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE mt_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_bridge_status ENABLE ROW LEVEL SECURITY;

-- mt_connections policies
CREATE POLICY "Users can view their own MT connections"
    ON mt_connections FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MT connections"
    ON mt_connections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MT connections"
    ON mt_connections FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MT connections"
    ON mt_connections FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- mt_sync_logs policies
CREATE POLICY "Users can view sync logs for their connections"
    ON mt_sync_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM mt_connections
            WHERE mt_connections.id = mt_sync_logs.connection_id
            AND mt_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sync logs for their connections"
    ON mt_sync_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM mt_connections
            WHERE mt_connections.id = mt_sync_logs.connection_id
            AND mt_connections.user_id = auth.uid()
        )
    );

-- mt_bridge_status policies
CREATE POLICY "Users can view their own bridge status"
    ON mt_bridge_status FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bridge status"
    ON mt_bridge_status FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bridge status"
    ON mt_bridge_status FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at for mt_connections
CREATE TRIGGER trigger_mt_connections_updated_at
    BEFORE UPDATE ON mt_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_mt_updated_at();

-- Trigger: Auto-update updated_at for mt_bridge_status
CREATE TRIGGER trigger_mt_bridge_status_updated_at
    BEFORE UPDATE ON mt_bridge_status
    FOR EACH ROW
    EXECUTE FUNCTION update_mt_updated_at();

-- Function: Update account balance from mt_connections
CREATE OR REPLACE FUNCTION sync_account_balance_from_mt()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the linked account's balance when MT connection balance changes
    IF NEW.account_balance IS NOT NULL AND NEW.connection_status = 'connected' THEN
        UPDATE accounts
        SET balance = NEW.account_balance,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sync account balance when MT connection updates
CREATE TRIGGER trigger_sync_account_balance
    AFTER INSERT OR UPDATE OF account_balance, connection_status ON mt_connections
    FOR EACH ROW
    EXECUTE FUNCTION sync_account_balance_from_mt();

-- =====================================================
-- SECURITY NOTES
-- =====================================================
-- 
-- ENCRYPTION STRATEGY FOR INVESTOR PASSWORDS:
-- 
-- 1. CLIENT-SIDE ENCRYPTION (Recommended):
--    - Encrypt passwords in the browser before sending to Supabase
--    - Use Web Crypto API with AES-256-GCM
--    - Store encryption key securely (never in code)
--    - Example: crypto.subtle.encrypt()
--
-- 2. SUPABASE VAULT (Alternative):
--    - Use Supabase Vault for secure key storage
--    - Encrypt using Vault keys via Edge Functions
--    - Provides additional security layer
--
-- 3. NEVER:
--    - Store plain text passwords
--    - Log passwords in any form
--    - Transmit unencrypted passwords
--    - Share encryption keys in client code
--
-- 4. BEST PRACTICES:
--    - Use HTTPS for all connections
--    - Implement rate limiting on connection attempts
--    - Log all connection attempts for security audit
--    - Rotate encryption keys periodically
--    - Use investor (read-only) passwords, never master passwords
--
-- =====================================================

-- =====================================================
-- SAMPLE QUERIES FOR TESTING
-- =====================================================

-- Get all MT connections for a user
-- SELECT * FROM mt_connections WHERE user_id = auth.uid();

-- Get connection with sync history
-- SELECT 
--     c.*,
--     COUNT(l.id) as total_syncs,
--     MAX(l.synced_at) as last_sync
-- FROM mt_connections c
-- LEFT JOIN mt_sync_logs l ON c.id = l.connection_id
-- WHERE c.user_id = auth.uid()
-- GROUP BY c.id;

-- Get recent sync logs for a connection
-- SELECT * FROM mt_sync_logs 
-- WHERE connection_id = 'your-connection-id'
-- ORDER BY synced_at DESC
-- LIMIT 10;