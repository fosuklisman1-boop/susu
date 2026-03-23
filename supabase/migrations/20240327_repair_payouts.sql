-- Repair Script: Fix partial payout failures
-- Run this in your Supabase SQL editor to sync groups that were 
-- stuck after a payout record was created but before the cycle was advanced.

-- 0. Ensure current_cycle column exists (was missing in target DB)
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS current_cycle INTEGER DEFAULT 1;
UPDATE public.savings_groups SET current_cycle = 1 WHERE group_type = 'rotating' AND current_cycle IS NULL;

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find groups where a payout exists for the CURRENT cycle
    -- This indicates the payout was recorded but the increment failed.
    FOR r IN 
        SELECT 
            p.id as payout_id,
            p.group_id,
            p.user_id,
            p.amount,
            p.cycle_number
        FROM public.payouts p
        JOIN public.savings_groups g ON g.id = p.group_id
        WHERE g.group_type = 'rotating' 
          AND p.cycle_number = g.current_cycle
          AND p.status = 'completed'
    LOOP
        RAISE NOTICE 'Repairing Group: %, Cycle: %', r.group_id, r.cycle_number;

        -- 1. Increment Group Cycle
        UPDATE public.savings_groups
        SET current_cycle = r.cycle_number + 1,
            updated_at = NOW()
        WHERE id = r.group_id;

        -- 2. Deduct from Group Wallet
        UPDATE public.wallets
        SET balance = balance - r.amount,
            updated_at = NOW()
        WHERE group_id = r.group_id;

        -- 3. Credit Recipient's Personal Wallet
        INSERT INTO public.wallets (user_id, balance)
        VALUES (r.user_id, r.amount)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = public.wallets.balance + EXCLUDED.balance,
            updated_at = NOW();

        -- 4. Record missing Ledger entries
        -- Group Outflow
        INSERT INTO public.transactions (user_id, group_id, type, amount, status, reference, source_table, source_id, metadata)
        VALUES (
            r.user_id, 
            r.group_id, 
            'withdrawal', 
            r.amount, 
            'success', 
            'REPAIR-OUT-' || r.group_id || '-' || r.cycle_number || '-' || extract(epoch from now())::text, 
            'payouts', 
            r.payout_id,
            jsonb_build_object('cycle', r.cycle_number, 'type', 'manual_repair_payout_withdrawal')
        );

        -- User Inflow
        INSERT INTO public.transactions (user_id, type, amount, status, reference, source_table, source_id, metadata)
        VALUES (
            r.user_id, 
            'plan_deposit', 
            r.amount, 
            'success', 
            'REPAIR-IN-' || r.group_id || '-' || r.cycle_number || '-' || extract(epoch from now())::text, 
            'payouts', 
            r.payout_id,
            jsonb_build_object('cycle', r.cycle_number, 'type', 'manual_repair_payout_deposit')
        );

    END LOOP;
END $$;
