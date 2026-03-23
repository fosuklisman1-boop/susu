-- Migration: Atomic Group Payout RPC
-- This function ensures that recording a payout, incrementing the cycle, 
-- updating wallets, and ledgering transactions happen as a single atomic unit.

-- 0. Ensure current_cycle column exists (was missing in target DB)
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS current_cycle INTEGER DEFAULT 1;
UPDATE public.savings_groups SET current_cycle = 1 WHERE group_type = 'rotating' AND current_cycle IS NULL;

CREATE OR REPLACE FUNCTION public.process_group_payout(
    p_group_id UUID,
    p_user_id UUID,
    p_amount NUMERIC,
    p_cycle_number INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payout_id UUID;
    v_current_cycle INTEGER;
    v_group_wallet_id UUID;
BEGIN
    -- 1. Verify group exists and get current info
    SELECT current_cycle INTO v_current_cycle
    FROM public.savings_groups
    WHERE id = p_group_id;

    IF v_current_cycle IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Group not found or invalid.');
    END IF;

    -- 2. Insert Payout Record
    INSERT INTO public.payouts (group_id, user_id, amount, cycle_number, status)
    VALUES (p_group_id, p_user_id, p_amount, p_cycle_number, 'completed')
    RETURNING id INTO v_payout_id;

    -- 3. Increment Cycle in Group
    UPDATE public.savings_groups
    SET current_cycle = p_cycle_number + 1,
        updated_at = NOW()
    WHERE id = p_group_id;

    -- 4. Deduct from Group Wallet
    UPDATE public.wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE group_id = p_group_id;

    -- 5. Credit Recipient's Personal Wallet
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.wallets.balance + EXCLUDED.balance,
        updated_at = NOW();

    -- 6. Record Ledger entries for auditability
    -- Group Outflow
    INSERT INTO public.transactions (user_id, group_id, type, amount, status, reference, source_table, source_id, metadata)
    VALUES (
        p_user_id, 
        p_group_id, 
        'withdrawal', 
        p_amount, 
        'success', 
        'PAYOUT-OUT-' || p_group_id || '-' || p_cycle_number || '-' || extract(epoch from now())::text, 
        'payouts', 
        v_payout_id,
        jsonb_build_object('cycle', p_cycle_number, 'type', 'payout_withdrawal')
    );

    -- User Inflow
    INSERT INTO public.transactions (user_id, type, amount, status, reference, source_table, source_id, metadata)
    VALUES (
        p_user_id, 
        'plan_deposit', 
        p_amount, 
        'success', 
        'PAYOUT-IN-' || p_group_id || '-' || p_cycle_number || '-' || extract(epoch from now())::text, 
        'payouts', 
        v_payout_id,
        jsonb_build_object('cycle', p_cycle_number, 'type', 'payout_deposit')
    );

    RETURN jsonb_build_object('success', true, 'payout_id', v_payout_id);

EXCEPTION WHEN OTHERS THEN
    -- Any failure here will ROLLBACK the entire transaction
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
