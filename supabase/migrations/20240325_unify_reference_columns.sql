-- Phase 10: Unifying Reference Columns across all tables

-- 1. Standardize 'contributions' table
-- Check if 'reference' already exists (it should from wallet migration), if not, rename payment_reference
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contributions' AND column_name='payment_reference') THEN
        -- If 'reference' also exists, we might need to merge or drop one. 
        -- Standardize on 'reference'
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contributions' AND column_name='reference') THEN
            ALTER TABLE public.contributions RENAME COLUMN payment_reference TO reference;
        ELSE
            -- Both exist, ensure payment_reference data is moved if needed, then drop
            UPDATE public.contributions SET reference = payment_reference WHERE reference IS NULL;
            ALTER TABLE public.contributions DROP COLUMN IF EXISTS payment_reference;
        END IF;
    END IF;
    
    -- Drop provider_reference if it exists and merge into reference
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contributions' AND column_name='provider_reference') THEN
        UPDATE public.contributions SET reference = provider_reference WHERE reference IS NULL;
        ALTER TABLE public.contributions DROP COLUMN provider_reference;
    END IF;
END $$;

-- 2. Standardize 'group_contributions' table
DO $$ 
BEGIN 
    -- If 'payment_reference' exists, rename to 'reference'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_contributions' AND column_name='payment_reference') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_contributions' AND column_name='reference') THEN
            ALTER TABLE public.group_contributions RENAME COLUMN payment_reference TO reference;
        ELSE
            UPDATE public.group_contributions SET reference = payment_reference WHERE reference IS NULL;
            ALTER TABLE public.group_contributions DROP COLUMN IF EXISTS payment_reference;
        END IF;
    END IF;

    -- If 'provider_reference' exists (from momo migration), merge and drop
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_contributions' AND column_name='provider_reference') THEN
        -- If reference doesn't exist yet (unlikely), create it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_contributions' AND column_name='reference') THEN
            ALTER TABLE public.group_contributions RENAME COLUMN provider_reference TO reference;
        ELSE
            UPDATE public.group_contributions SET reference = provider_reference WHERE reference IS NULL;
            ALTER TABLE public.group_contributions DROP COLUMN provider_reference;
        END IF;
    END IF;

    -- Ensure 'reference' has a unique constraint
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_contributions' AND column_name='reference') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_contributions_reference_key') THEN
            ALTER TABLE public.group_contributions ADD CONSTRAINT group_contributions_reference_key UNIQUE (reference);
        END IF;
    END IF;
END $$;

-- 3. Update Wallet Triggers to use the unified 'reference' column
-- (Redefining the function from the wallet migration to use 'reference' exclusively)
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
            VALUES (NEW.user_id, 'plan_deposit', NEW.amount, 'success', NEW.reference, 'contributions', NEW.id)
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
            VALUES (NEW.user_id, NEW.group_id, 'group_deposit', NEW.amount, 'success', NEW.reference, 'group_contributions', NEW.id)
            ON CONFLICT (reference) DO NOTHING;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Re-sync Ledger logic in backfill function (if needed)
CREATE OR REPLACE FUNCTION sync_wallets_initial_unified()
RETURNS void AS $$
BEGIN
    INSERT INTO transactions (user_id, group_id, type, amount, status, reference, source_table, source_id, created_at)
    SELECT user_id, group_id, 'group_deposit', amount, 'success', reference, 'group_contributions', id, COALESCE(paid_at, NOW())
    FROM group_contributions WHERE LOWER(status) = 'success' ON CONFLICT DO NOTHING;
    
    INSERT INTO transactions (user_id, type, amount, status, reference, source_table, source_id, created_at)
    SELECT user_id, 'plan_deposit', amount, 'success', reference, 'contributions', id, COALESCE(paid_at, NOW())
    FROM contributions WHERE LOWER(status) = 'success' ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
