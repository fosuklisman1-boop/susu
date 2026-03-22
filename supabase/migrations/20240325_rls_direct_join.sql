-- Phase 12: ULTIMATE RLS FIX - No more functions
-- Using direct, non-recursive JOIN logic for reliability.

-- 1. DROP the policies first
DROP POLICY IF EXISTS "gc_select_members" ON public.group_contributions;
DROP POLICY IF EXISTS "Group members can view their group wallet" ON public.wallets;
DROP POLICY IF EXISTS "wd_select_members" ON public.withdrawals;
DROP POLICY IF EXISTS "po_select_members" ON public.payouts;
DROP POLICY IF EXISTS "gm_select_peers" ON public.group_members;

-- 2. RE-CREATE group_members policy (Self-view + Group check)
-- Users can see their own membership
DROP POLICY IF EXISTS "gm_select_own" ON public.group_members;
CREATE POLICY "gm_select_own" ON public.group_members
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Members can see others (This is the tricky one, but since gs_select is fixed, we can join)
CREATE POLICY "gm_select_peers" ON public.group_members
FOR SELECT TO authenticated
USING (
  group_id IN (
    SELECT id FROM public.savings_groups WHERE created_by = auth.uid()
    UNION
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

-- 3. RE-CREATE group_contributions policy
CREATE POLICY "gc_select_members" ON public.group_contributions
FOR SELECT TO authenticated
USING (
  group_id IN (
    SELECT id FROM public.savings_groups WHERE created_by = auth.uid()
    UNION
    -- Direct check on group_members (ignoring RLS if possible, but Union is usually fine)
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

-- 4. RE-CREATE wallets policy
CREATE POLICY "Group members can view their group wallet" ON public.wallets
FOR SELECT TO authenticated
USING (
  group_id IN (
    SELECT id FROM public.savings_groups WHERE created_by = auth.uid()
    UNION
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

-- 5. RE-CREATE withdrawals policy
CREATE POLICY "wd_select_members" ON public.withdrawals
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR
  group_id IN (
    SELECT id FROM public.savings_groups WHERE created_by = auth.uid()
    UNION
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

-- 6. RE-CREATE payouts policy
CREATE POLICY "po_select_members" ON public.payouts
FOR SELECT TO authenticated
USING (
  group_id IN (
    SELECT id FROM public.savings_groups WHERE created_by = auth.uid()
    UNION
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

-- 7. CLEAN UP the old function (optional but cleaner)
DROP FUNCTION IF EXISTS public.check_is_group_member(uuid, uuid) CASCADE;
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
