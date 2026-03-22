-- Phase 13: Emergency RLS Restoration
-- This script creates a NEW function name to avoid any "cannot change parameter" errors.

-- 1. Create a fresh security definer function
CREATE OR REPLACE FUNCTION public.is_group_participant(check_gid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Returns true if the current user is either the creator or a member
  RETURN EXISTS (
    SELECT 1 FROM public.savings_groups
    WHERE id = check_gid AND created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_gid AND user_id = auth.uid()
  );
END;
$$;

-- 2. Apply this to ALL relevant tables
-- SAVINGS GROUPS
DROP POLICY IF EXISTS "gs_select_members" ON public.savings_groups;
DROP POLICY IF EXISTS "gs_select_creator" ON public.savings_groups;
CREATE POLICY "gs_access_v3" ON public.savings_groups
FOR SELECT TO authenticated
USING (
  created_by = auth.uid() 
  OR 
  id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- GROUP MEMBERS
DROP POLICY IF EXISTS "gm_select_own" ON public.group_members;
DROP POLICY IF EXISTS "gm_select_peers" ON public.group_members;
CREATE POLICY "gm_access_v3" ON public.group_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR
  public.is_group_participant(group_id)
);

-- WALLETS
DROP POLICY IF EXISTS "Group members can view their group wallet" ON public.wallets;
DROP POLICY IF EXISTS "view_own_wallet" ON public.wallets;
CREATE POLICY "wallet_access_v3" ON public.wallets
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() -- Personal wallet
  OR
  public.is_group_participant(group_id) -- Group wallet
);

-- CONTRIBUTIONS (Group)
DROP POLICY IF EXISTS "gc_select_members" ON public.group_contributions;
CREATE POLICY "gc_access_v3" ON public.group_contributions
FOR SELECT TO authenticated
USING (
  public.is_group_participant(group_id)
);

-- WITHDRAWALS
DROP POLICY IF EXISTS "wd_select_members" ON public.withdrawals;
CREATE POLICY "wd_access_v3" ON public.withdrawals
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR
  public.is_group_participant(group_id)
);

-- PAYOUTS
DROP POLICY IF EXISTS "po_select_members" ON public.payouts;
CREATE POLICY "po_access_v3" ON public.payouts
FOR SELECT TO authenticated
USING (
  public.is_group_participant(group_id)
);
