-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES savings_groups(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'GHS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT wallet_target_check CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR 
        (user_id IS NULL AND group_id IS NOT NULL)
    ),
    CONSTRAINT unique_user_wallet UNIQUE (user_id),
    CONSTRAINT unique_group_wallet UNIQUE (group_id)
);

-- 2. Add current_balance to susu_plans
ALTER TABLE public.susu_plans ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12, 2) DEFAULT 0.00;

-- 3. Ensure group_id exists on withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE;

-- 4. Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
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

DROP POLICY IF EXISTS "Service role full access" ON wallets;
CREATE POLICY "Service role full access" 
ON wallets FOR ALL 
USING (true) 
WITH CHECK (true);

-- 6. Unified Contribution Trigger Function
CREATE OR REPLACE FUNCTION update_wallet_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if status changed to 'success'
    IF (TG_OP = 'INSERT' AND NEW.status = 'success') OR (TG_OP = 'UPDATE' AND OLD.status != 'success' AND NEW.status = 'success') THEN
        
        -- Handle PERSONAL Contribution
        IF TG_TABLE_NAME = 'contributions' THEN
            -- Update Personal Wallet
            INSERT INTO wallets (user_id, balance)
            VALUES (NEW.user_id, NEW.amount)
            ON CONFLICT (user_id) DO UPDATE
            SET balance = wallets.balance + EXCLUDED.balance,
                updated_at = NOW();

            -- Update Plan Balance
            IF NEW.plan_id IS NOT NULL THEN
                UPDATE susu_plans 
                SET current_balance = current_balance + NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.plan_id;
            END IF;

        -- Handle GROUP Contribution
        ELSIF TG_TABLE_NAME = 'group_contributions' THEN
            -- Update Group Wallet
            INSERT INTO wallets (group_id, balance)
            VALUES (NEW.group_id, NEW.amount)
            ON CONFLICT (group_id) DO UPDATE
            SET balance = wallets.balance + EXCLUDED.balance,
                updated_at = NOW();
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Unified Withdrawal Trigger Function
CREATE OR REPLACE FUNCTION update_wallet_on_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
    -- Subtract from balance when status becomes 'pending', 'approved', or 'completed'
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

-- 8. Apply Triggers
DROP TRIGGER IF EXISTS tr_update_wallet_on_contribution ON contributions;
CREATE TRIGGER tr_update_wallet_on_contribution
AFTER INSERT OR UPDATE ON contributions
FOR EACH ROW EXECUTE FUNCTION update_wallet_on_contribution();

DROP TRIGGER IF EXISTS tr_update_group_wallet_on_contribution ON group_contributions;
CREATE TRIGGER tr_update_group_wallet_on_contribution
AFTER INSERT OR UPDATE ON group_contributions
FOR EACH ROW EXECUTE FUNCTION update_wallet_on_contribution();

DROP TRIGGER IF EXISTS tr_update_wallet_on_withdrawal ON withdrawals;
CREATE TRIGGER tr_update_wallet_on_withdrawal
AFTER INSERT OR UPDATE ON withdrawals
FOR EACH ROW EXECUTE FUNCTION update_wallet_on_withdrawal();

-- 9. Comprehensive Backfill Function
CREATE OR REPLACE FUNCTION sync_wallets_initial()
RETURNS void AS $$
BEGIN
    -- Reset
    DELETE FROM wallets;
    UPDATE susu_plans SET current_balance = 0;

    -- Initialize 0.00 wallets for all users and groups
    INSERT INTO wallets (user_id, balance)
    SELECT id, 0.00 FROM auth.users
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO wallets (group_id, balance)
    SELECT id, 0.00 FROM savings_groups
    ON CONFLICT (group_id) DO NOTHING;

    -- Backfill Personal Contributions
    UPDATE wallets w
    SET balance = w.balance + sub.total_in, updated_at = NOW()
    FROM (
        SELECT user_id, SUM(amount) as total_in
        FROM contributions WHERE status = 'success' GROUP BY user_id
    ) sub WHERE w.user_id = sub.user_id;

    -- Backfill Plan Balances
    UPDATE susu_plans p
    SET current_balance = sub.total_in, updated_at = NOW()
    FROM (
        SELECT plan_id, SUM(amount) as total_in
        FROM contributions WHERE status = 'success' AND plan_id IS NOT NULL GROUP BY plan_id
    ) sub WHERE p.id = sub.plan_id;

    -- Backfill Group Contributions
    UPDATE wallets w
    SET balance = w.balance + sub.total_in, updated_at = NOW()
    FROM (
        SELECT group_id, SUM(amount) as total_in
        FROM group_contributions WHERE status = 'success' GROUP BY group_id
    ) sub WHERE w.group_id = sub.group_id;

    -- Subtract Withdrawals (Personal)
    UPDATE wallets w
    SET balance = w.balance - sub.total_out, updated_at = NOW()
    FROM (
        SELECT user_id, SUM(amount) as total_out
        FROM withdrawals WHERE group_id IS NULL AND status IN ('pending', 'approved', 'completed') GROUP BY user_id
    ) sub WHERE w.user_id = sub.user_id;

    -- Subtract Withdrawals (Group)
    UPDATE wallets w
    SET balance = w.balance - sub.total_out, updated_at = NOW()
    FROM (
        SELECT group_id, SUM(amount) as total_out
        FROM withdrawals WHERE group_id IS NOT NULL AND status IN ('pending', 'approved', 'completed') GROUP BY group_id
    ) sub WHERE w.group_id = sub.group_id;

END;
$$ LANGUAGE plpgsql;

-- 10. Execute Initial Sync
SELECT sync_wallets_initial();
