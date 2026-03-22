-- Phase 11: RLS Hardening & Broadened Access (FINAL FIX)

-- 1. Drop old function with CASCADE to handle dependencies (policies)
-- This will automatically drop policies like 'gm_select_peers', 'gc_select_members', etc.
DROP FUNCTION IF EXISTS public.check_is_group_member(uuid, uuid) CASCADE;

-- 2. Re-create the hardened membership check function
CREATE OR REPLACE FUNCTION public.check_is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$;

-- 3. Re-create all dependent policies for group_members
DROP POLICY IF EXISTS "gm_select_peers" ON public.group_members;
CREATE POLICY "gm_select_peers" ON public.group_members
FOR SELECT TO authenticated
USING (public.check_is_group_member(group_id, auth.uid()));

-- 4. Re-create and broaden group_contributions RLS
DROP POLICY IF EXISTS "gc_select_members" ON public.group_contributions;
CREATE POLICY "gc_select_members" ON public.group_contributions
FOR SELECT TO authenticated
USING (
  public.check_is_group_member(group_id, auth.uid())
  OR
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);

-- 5. Standardize RLS for wallets
DROP POLICY IF EXISTS "Group members can view their group wallet" ON public.wallets;
CREATE POLICY "Group members can view their group wallet" ON public.wallets
FOR SELECT TO authenticated
USING (
  public.check_is_group_member(group_id, auth.uid())
  OR
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);

-- 6. Re-create withdrawals RLS (which also depended on the function)
DROP POLICY IF EXISTS "wd_select_members" ON public.withdrawals;
CREATE POLICY "wd_select_members" ON public.withdrawals
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR 
    public.check_is_group_member(group_id, auth.uid())
    OR
    group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);

-- 7. Re-create payouts RLS
DROP POLICY IF EXISTS "po_select_members" ON public.payouts;
CREATE POLICY "po_select_members" ON public.payouts
FOR SELECT TO authenticated
USING (
  public.check_is_group_member(group_id, auth.uid())
  OR
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);
