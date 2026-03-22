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

-- 2. Create Unified Transactions Ledger
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES savings_groups(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('plan_deposit', 'group_deposit', 'withdrawal', 'reversal')),
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL,
    reference TEXT UNIQUE, -- Unified reference (either MoMo or Paystack)
    source_table TEXT,      -- 'contributions', 'group_contributions', or 'withdrawals'
    source_id UUID,         -- ID of the original record
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add current_balance to susu_plans
ALTER TABLE public.susu_plans ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12, 2) DEFAULT 0.00;

-- 4. Ensure all MoMo-related and Ledger-related columns exist on base tables
-- For Standard Contributions
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS reference TEXT UNIQUE;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paystack';
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS notes TEXT;

-- For Group Contributions
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS provider_reference TEXT UNIQUE;
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paystack';
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS notes TEXT;

-- For Withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS reference TEXT UNIQUE;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'momo';
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Users can view their own personal wallet" ON wallets;
CREATE POLICY "Users can view their own personal wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group members can view their group wallet" ON wallets;
CREATE POLICY "Group members can view their group wallet" ON wallets FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Service role full access" ON wallets;
CREATE POLICY "Service role full access" ON wallets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access transactions" ON transactions;
CREATE POLICY "Service role full access transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- 7. Unified Contribution Trigger Function (Hardened & Ledger Integrated)
CREATE OR REPLACE FUNCTION update_wallet_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if status changed to 'success' (case-insensitive)
    IF (TG_OP = 'INSERT' AND LOWER(NEW.status) = 'success') OR 
       (TG_OP = 'UPDATE' AND LOWER(OLD.status) != 'success' AND LOWER(NEW.status) = 'success') THEN
        
        -- Handle PERSONAL Contribution
        IF TG_TABLE_NAME = 'contributions' THEN
            -- 1. Update Plan Balance if it belongs to a goal
            IF NEW.plan_id IS NOT NULL THEN
                UPDATE susu_plans 
                SET current_balance = current_balance + NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.plan_id;
            ELSE
                -- 2. Update Personal Wallet only if it's a direct top-up
                INSERT INTO wallets (user_id, balance)
                VALUES (NEW.user_id, NEW.amount)
                ON CONFLICT (user_id) DO UPDATE
                SET balance = wallets.balance + EXCLUDED.balance,
                    updated_at = NOW();
            END IF;

            -- 3. Create Ledger Entry
            INSERT INTO transactions (user_id, type, amount, status, reference, source_table, source_id)
            VALUES (NEW.user_id, 'plan_deposit', NEW.amount, 'success', COALESCE(NEW.reference, NEW.payment_reference), 'contributions', NEW.id)
            ON CONFLICT (reference) DO NOTHING;

        -- Handle GROUP Contribution
        ELSIF TG_TABLE_NAME = 'group_contributions' THEN
            -- 1. Update Group Wallet
            INSERT INTO wallets (group_id, balance)
            VALUES (NEW.group_id, NEW.amount)
            ON CONFLICT (group_id) DO UPDATE
            SET balance = wallets.balance + EXCLUDED.balance,
                updated_at = NOW();

            -- 2. Create Ledger Entry
            INSERT INTO transactions (user_id, group_id, type, amount, status, reference, source_table, source_id)
            VALUES (NEW.user_id, NEW.group_id, 'group_deposit', NEW.amount, 'success', COALESCE(NEW.provider_reference, NEW.payment_reference), 'group_contributions', NEW.id)
            ON CONFLICT (reference) DO NOTHING;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Unified Withdrawal Trigger Function (Ledger Integrated)
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

        -- Record in Ledger (if not already there as pending)
        INSERT INTO transactions (user_id, group_id, type, amount, status, reference, source_table, source_id)
        VALUES (NEW.user_id, NEW.group_id, 'withdrawal', NEW.amount, NEW.status, NEW.reference, 'withdrawals', NEW.id)
        ON CONFLICT (reference) DO UPDATE SET status = EXCLUDED.status;

    -- Finalize in Ledger when 'completed'
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'completed') THEN
        UPDATE transactions SET status = 'completed' WHERE reference = NEW.reference;

    -- Add back and Mark 'reversal' if status becomes 'failed' or 'rejected'
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'approved', 'completed') AND NEW.status IN ('failed', 'rejected')) THEN
        
        IF NEW.group_id IS NOT NULL THEN
            UPDATE wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE group_id = NEW.group_id;
        ELSE
            UPDATE wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE user_id = NEW.user_id;
        END IF;

        -- Update Ledger
        UPDATE transactions SET status = 'failed' WHERE reference = NEW.reference;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Apply Triggers
DROP TRIGGER IF EXISTS tr_update_wallet_on_contribution ON contributions;
CREATE TRIGGER tr_update_wallet_on_contribution AFTER INSERT OR UPDATE ON contributions FOR EACH ROW EXECUTE FUNCTION update_wallet_on_contribution();

DROP TRIGGER IF EXISTS tr_update_group_wallet_on_contribution ON group_contributions;
CREATE TRIGGER tr_update_group_wallet_on_contribution AFTER INSERT OR UPDATE ON group_contributions FOR EACH ROW EXECUTE FUNCTION update_wallet_on_contribution();

DROP TRIGGER IF EXISTS tr_update_wallet_on_withdrawal ON withdrawals;
CREATE TRIGGER tr_update_wallet_on_withdrawal AFTER INSERT OR UPDATE ON withdrawals FOR EACH ROW EXECUTE FUNCTION update_wallet_on_withdrawal();

-- 10. Comprehensive Backfill Function (including Ledger)
CREATE OR REPLACE FUNCTION sync_wallets_initial()
RETURNS void AS $$
BEGIN
    -- Reset all states for clean backfill
    DELETE FROM wallets;
    DELETE FROM transactions;
    UPDATE susu_plans SET current_balance = 0;

    -- Initialize 0.00 wallets for all users and groups
    INSERT INTO wallets (user_id, balance) SELECT id, 0.00 FROM auth.users ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO wallets (group_id, balance) SELECT id, 0.00 FROM savings_groups ON CONFLICT (group_id) DO NOTHING;

    -- Backfill Personal Contributions -> Wallets & Ledger
    INSERT INTO transactions (user_id, type, amount, status, reference, source_table, source_id, created_at)
    SELECT user_id, 'plan_deposit', amount, 'success', COALESCE(reference, payment_reference), 'contributions', id, COALESCE(paid_at, NOW())
    FROM contributions WHERE LOWER(status) = 'success' ON CONFLICT DO NOTHING;

    UPDATE wallets w SET balance = w.balance + sub.total_in, updated_at = NOW()
    FROM (SELECT user_id, SUM(amount) as total_in FROM contributions WHERE LOWER(status) = 'success' AND plan_id IS NULL GROUP BY user_id) sub WHERE w.user_id = sub.user_id;

    UPDATE susu_plans p SET current_balance = sub.total_in, updated_at = NOW()
    FROM (SELECT plan_id, SUM(amount) as total_in FROM contributions WHERE LOWER(status) = 'success' AND plan_id IS NOT NULL GROUP BY plan_id) sub WHERE p.id = sub.plan_id;

    -- Backfill Group Contributions -> Wallets & Ledger
    INSERT INTO transactions (user_id, group_id, type, amount, status, reference, source_table, source_id, created_at)
    SELECT user_id, group_id, 'group_deposit', amount, 'success', COALESCE(provider_reference, payment_reference), 'group_contributions', id, COALESCE(paid_at, NOW())
    FROM group_contributions WHERE LOWER(status) = 'success' ON CONFLICT DO NOTHING;

    UPDATE wallets w SET balance = w.balance + sub.total_in, updated_at = NOW()
    FROM (SELECT group_id, SUM(amount) as total_in FROM group_contributions WHERE LOWER(status) = 'success' GROUP BY group_id) sub WHERE w.group_id = sub.group_id;

    -- Backfill Withdrawals -> Wallets & Ledger
    INSERT INTO transactions (user_id, group_id, type, amount, status, reference, source_table, source_id, created_at)
    SELECT user_id, group_id, 'withdrawal', amount, status, reference, 'withdrawals', id, created_at
    FROM withdrawals WHERE status IN ('pending', 'approved', 'completed') ON CONFLICT DO NOTHING;

    UPDATE wallets w SET balance = w.balance - sub.total_out, updated_at = NOW()
    FROM (SELECT user_id, SUM(amount) as total_out FROM withdrawals WHERE group_id IS NULL AND status IN ('pending', 'approved', 'completed') GROUP BY user_id) sub WHERE w.user_id = sub.user_id;

    UPDATE wallets w SET balance = w.balance - sub.total_out, updated_at = NOW()
    FROM (SELECT group_id, SUM(amount) as total_out FROM withdrawals WHERE group_id IS NOT NULL AND status IN ('pending', 'approved', 'completed') GROUP BY group_id) sub WHERE w.group_id = sub.group_id;

END;
$$ LANGUAGE plpgsql;

-- 11. Execute Initial Sync
SELECT sync_wallets_initial();
