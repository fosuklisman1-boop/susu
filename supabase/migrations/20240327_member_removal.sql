-- Phase 37: Atomic Member Removal Helpers
-- Allows shifting payout orders when a member is removed before participating.

CREATE OR REPLACE FUNCTION public.shift_payout_orders(
    p_group_id UUID,
    p_deleted_order INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.group_members
    SET payout_order = payout_order - 1
    WHERE group_id = p_group_id
    AND payout_order > p_deleted_order;
END;
$$;
