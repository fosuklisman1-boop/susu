-- Phase 51: Group Rotations & Completion Flow

-- 1. Add rotation_index to savings_groups (tracks the current round of the group)
ALTER TABLE public.savings_groups 
ADD COLUMN IF NOT EXISTS rotation_index INTEGER DEFAULT 1;

-- 2. Add rotation_number to contributions (tracks which round this payment belongs to)
ALTER TABLE public.contributions 
ADD COLUMN IF NOT EXISTS rotation_number INTEGER DEFAULT 1;

-- 3. Add rotation_number to payouts (tracks which round this payout belongs to)
ALTER TABLE public.payouts 
ADD COLUMN IF NOT EXISTS rotation_number INTEGER DEFAULT 1;

-- 4. Create an index for performance
CREATE INDEX IF NOT EXISTS idx_contributions_rotation ON public.contributions(group_id, rotation_number);
CREATE INDEX IF NOT EXISTS idx_payouts_rotation ON public.payouts(group_id, rotation_number);

-- 5. Update the atomic payout function to be "Round-Aware"
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
    v_group_wallet_id UUID;
    v_user_wallet_id UUID;
    v_recipient_profile_id UUID;
    v_current_cycle INTEGER;
    v_max_members INTEGER;
    v_rotation_index INTEGER;
    v_everyone_paid BOOLEAN;
BEGIN
    -- 1. Get Group details (Lock for update)
    SELECT wallet_id, current_cycle, max_members, rotation_index 
    INTO v_group_wallet_id, v_current_cycle, v_max_members, v_rotation_index
    FROM public.savings_groups
    WHERE id = p_group_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Group not found');
    END IF;

    -- 2. Validate Cycle
    IF p_cycle_number != v_current_cycle THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cycle mismatch. Expected ' || v_current_cycle);
    END IF;

    -- 3. Check if everyone paid for this cycle and rotation
    SELECT COUNT(*) = v_max_members INTO v_everyone_paid
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
    AND EXISTS (
        SELECT 1 FROM public.contributions c
        WHERE c.group_id = p_group_id
        AND c.user_id = gm.user_id
        AND c.cycle_number = v_current_cycle
        AND c.rotation_number = v_rotation_index
    );

    IF NOT v_everyone_paid THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not everyone has paid for this cycle yet');
    END IF;

    -- 4. Record the Payout with rotation_number
    INSERT INTO public.payouts (group_id, user_id, amount, cycle_number, status, rotation_number)
    VALUES (p_group_id, p_user_id, p_amount, p_cycle_number, 'completed', v_rotation_index);

    -- 5. Update Wallets & Ledger
    -- Deduct from group pot
    UPDATE public.wallets 
    SET available_balance = available_balance - p_amount,
        total_balance = total_balance - p_amount
    WHERE id = v_group_wallet_id;

    INSERT INTO public.ledger_entries (wallet_id, amount, type, description, reference_id)
    VALUES (v_group_wallet_id, -p_amount, 'debit', 'Group Payout - Cycle ' || p_cycle_number || ' (Round ' || v_rotation_index || ')', p_group_id);

    -- Credit user wallet
    SELECT wallet_id INTO v_user_wallet_id FROM public.profiles WHERE id = p_user_id;

    UPDATE public.wallets 
    SET available_balance = available_balance + p_amount,
        total_balance = total_balance + p_amount
    WHERE id = v_user_wallet_id;

    INSERT INTO public.ledger_entries (wallet_id, amount, type, description, reference_id)
    VALUES (v_user_wallet_id, p_amount, 'credit', 'Group Payout Received - Cycle ' || p_cycle_number || ' (Round ' || v_rotation_index || ')', p_group_id);

    -- 6. Advance Cycle OR Complete Group
    IF v_current_cycle >= v_max_members THEN
        -- Final payout recorded! Close the group
        UPDATE public.savings_groups 
        SET status = 'completed',
            current_cycle = v_current_cycle + 1 -- Keep incrementing for records
        WHERE id = p_group_id;
    ELSE
        -- Move to next cycle
        UPDATE public.savings_groups 
        SET current_cycle = v_current_cycle + 1
        WHERE id = p_group_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'is_completed', v_current_cycle >= v_max_members);
END;
$$;
