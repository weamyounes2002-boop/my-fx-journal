-- =====================================================
-- MT4/MT5 Integration Database Schema (FIXED)
-- =====================================================

-- Table: mt_connections
CREATE TABLE IF NOT EXISTS mt_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
    
    -- Platform and connection details
    platform_type TEXT NOT NULL CHECK (platform_type IN ('MT4', 'MT5')),
    login_number TEXT NOT NULL,
    broker_server TEXT NOT NULL,
    
    -- Security: Encrypted investor password
    investor_password_encrypted TEXT NOT NULL,
    
    -- Connection status tracking
    connection_status TEXT DEFAULT 'disconnected' CHECK (
        connection_status IN ('connected', 'disconnected', 'error', 'pending')
    ),
    last_sync_time TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    
    -- Account financial data
    account_balance NUMERIC(15, 2) DEFAULT 0,
    account_equity NUMERIC(15, 2) DEFAULT 0,
    account_margin NUMERIC(15, 2) DEFAULT 0,
    account_free_margin NUMERIC(15, 2) DEFAULT 0,
    account_margin_level NUMERIC(10, 2) DEFAULT 0,
    
    -- Additional account info
    account_currency TEXT DEFAULT 'USD',
    account_leverage TEXT,
    account_company TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(user_id, login_number, broker_server)
);

-- Table: mt_sync_logs (FIXED: connection_id is UUID, not TEXT)
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
    sync_duration_ms INTEGER,
    data_size_kb INTEGER,
    
    -- Timestamps
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table: mt_bridge_status
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_mt_connections_user_id ON mt_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_connections_account_id ON mt_connections(account_id);
CREATE INDEX IF NOT EXISTS idx_mt_connections_status ON mt_connections(connection_status);
CREATE INDEX IF NOT EXISTS idx_mt_connections_platform ON mt_connections(platform_type);
CREATE INDEX IF NOT EXISTS idx_mt_connections_last_sync ON mt_connections(last_sync_time DESC);

CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_connection_id ON mt_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_status ON mt_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_mt_sync_logs_synced_at ON mt_sync_logs(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_mt_bridge_status_user_id ON mt_bridge_status(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_bridge_status_heartbeat ON mt_bridge_status(last_heartbeat DESC);

-- ROW LEVEL SECURITY
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

-- mt_sync_logs policies (FIXED: UUID comparison)
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

-- FUNCTIONS AND TRIGGERS
CREATE OR REPLACE FUNCTION update_mt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mt_connections_updated_at
    BEFORE UPDATE ON mt_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_mt_updated_at();

CREATE TRIGGER trigger_mt_bridge_status_updated_at
    BEFORE UPDATE ON mt_bridge_status
    FOR EACH ROW
    EXECUTE FUNCTION update_mt_updated_at();

CREATE OR REPLACE FUNCTION sync_account_balance_from_mt()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.account_balance IS NOT NULL AND NEW.connection_status = 'connected' THEN
        UPDATE accounts
        SET balance = NEW.account_balance,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_account_balance
    AFTER INSERT OR UPDATE OF account_balance, connection_status ON mt_connections
    FOR EACH ROW
    EXECUTE FUNCTION sync_account_balance_from_mt();
