-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES savings_groups(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'GHS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure either user_id or group_id is set, but not both at once for a single wallet entry
    -- (Though one user could have a wallet and one group could have a wallet separately)
    CONSTRAINT wallet_target_check CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR 
        (user_id IS NULL AND group_id IS NOT NULL)
    ),
    -- Ensure uniqueness for user wallets and group wallets
    CONSTRAINT unique_user_wallet UNIQUE (user_id),
    CONSTRAINT unique_group_wallet UNIQUE (group_id)
);

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own personal wallet" ON wallets;
CREATE POLICY "Users can view their own personal wallet" 
ON wallets FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group members can view their group wallet" ON wallets;
CREATE POLICY "Group members can view their group wallet" 
ON wallets FOR SELECT 
USING (
    group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
);

-- Internal service role can do anything
DROP POLICY IF EXISTS "Service role full access" ON wallets;
CREATE POLICY "Service role full access" 
ON wallets FOR ALL 
USING (true) 
WITH CHECK (true);

-- Function to update personal balance
CREATE OR REPLACE FUNCTION update_wallet_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if status changed to 'success'
    IF (TG_OP = 'INSERT' AND NEW.status = 'success') OR (TG_OP = 'UPDATE' AND OLD.status != 'success' AND NEW.status = 'success') THEN
        -- Upsert wallet for user
        INSERT INTO wallets (user_id, balance)
        VALUES (NEW.user_id, NEW.amount)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + EXCLUDED.balance,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update group balance
CREATE OR REPLACE FUNCTION update_group_wallet_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'success') OR (TG_OP = 'UPDATE' AND OLD.status != 'success' AND NEW.status = 'success') THEN
        -- Upsert wallet for group
        INSERT INTO wallets (group_id, balance)
        VALUES (NEW.group_id, NEW.amount)
        ON CONFLICT (group_id) DO UPDATE
        SET balance = wallets.balance + EXCLUDED.balance,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle withdrawals (Personal and Group)
CREATE OR REPLACE FUNCTION update_wallet_on_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
    -- Subtract from balance when status becomes 'pending', 'approved', or 'completed'
    -- We subtract at 'pending' to prevent double spending
    IF (TG_OP = 'INSERT' AND NEW.status IN ('pending', 'approved', 'completed')) OR 
       (TG_OP = 'UPDATE' AND OLD.status NOT IN ('pending', 'approved', 'completed') AND NEW.status IN ('pending', 'approved', 'completed')) THEN
        
        IF NEW.group_id IS NOT NULL THEN
            UPDATE wallets SET balance = balance - NEW.amount, updated_at = NOW() WHERE group_id = NEW.group_id;
        ELSE
            UPDATE wallets SET balance = balance - NEW.amount, updated_at = NOW() WHERE user_id = NEW.user_id;
        END IF;

    -- Add back if status becomes 'failed' or 'rejected'
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'approved', 'completed') AND NEW.status IN ('failed', 'rejected')) THEN
        
        IF NEW.group_id IS NOT NULL THEN
            UPDATE wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE group_id = NEW.group_id;
        ELSE
            UPDATE wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE user_id = NEW.user_id;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS tr_update_wallet_on_contribution ON contributions;
CREATE TRIGGER tr_update_wallet_on_contribution
AFTER INSERT OR UPDATE ON contributions
FOR EACH ROW EXECUTE FUNCTION update_wallet_on_contribution();

DROP TRIGGER IF EXISTS tr_update_group_wallet_on_contribution ON group_contributions;
CREATE TRIGGER tr_update_group_wallet_on_contribution
AFTER INSERT OR UPDATE ON group_contributions
FOR EACH ROW EXECUTE FUNCTION update_group_wallet_on_contribution();

DROP TRIGGER IF EXISTS tr_update_wallet_on_withdrawal ON withdrawals;
CREATE TRIGGER tr_update_wallet_on_withdrawal
AFTER INSERT OR UPDATE ON withdrawals
FOR EACH ROW EXECUTE FUNCTION update_wallet_on_withdrawal();

-- Backfill Function (to sync existing successes)
CREATE OR REPLACE FUNCTION sync_wallets_initial()
RETURNS void AS $$
BEGIN
    -- 1. Insert 0.00 balance wallets for ALL existing users
    INSERT INTO wallets (user_id, balance)
    SELECT id, 0.00
    FROM auth.users
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. Insert 0.00 balance wallets for ALL existing groups
    INSERT INTO wallets (group_id, balance)
    SELECT id, 0.00
    FROM savings_groups
    ON CONFLICT (group_id) DO NOTHING;

    -- 3. Calculate and apply balances from Standard Contributions
    UPDATE wallets w
    SET balance = w.balance + sub.total_in,
        updated_at = NOW()
    FROM (
        SELECT user_id, SUM(amount) as total_in
        FROM contributions
        WHERE status = 'success'
        GROUP BY user_id
    ) sub
    WHERE w.user_id = sub.user_id;

    -- 4. Calculate and apply balances from Group Contributions
    UPDATE wallets w
    SET balance = w.balance + sub.total_in,
        updated_at = NOW()
    FROM (
        SELECT group_id, SUM(amount) as total_in
        FROM group_contributions
        WHERE status = 'success'
        GROUP BY group_id
    ) sub
    WHERE w.group_id = sub.group_id;

    -- 5. Subtract Withdrawals
    -- For users
    UPDATE wallets w
    SET balance = w.balance - sub.total_out,
        updated_at = NOW()
    FROM (
        SELECT user_id, SUM(amount) as total_out
        FROM withdrawals
        WHERE group_id IS NULL AND status IN ('pending', 'approved', 'completed')
        GROUP BY user_id
    ) sub
    WHERE w.user_id = sub.user_id;

    -- For groups
    UPDATE wallets w
    SET balance = w.balance - sub.total_out,
        updated_at = NOW()
    FROM (
        SELECT group_id, SUM(amount) as total_out
        FROM withdrawals
        WHERE group_id IS NOT NULL AND status IN ('pending', 'approved', 'completed')
        GROUP BY group_id
    ) sub
    WHERE w.group_id = sub.group_id;

END;
$$ LANGUAGE plpgsql;

-- Ensure group_id exists on withdrawals (for existing DBs that might be out of sync with schema.sql)
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE;

-- Run Sync
SELECT sync_wallets_initial();
