-- Phase 13 & 14: ANTI-RECURSION RLS REFIX
-- This script fixes the infinite loop between group_members and is_group_participant.

-- 1. Create a truly non-recursive membership check
-- We define it as SECURITY DEFINER so it can bypass RLS on the tables it queries.
CREATE OR REPLACE FUNCTION public.is_group_participant(check_gid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We query the tables directly. Since it's SECURITY DEFINER, it bypasses RLS.
  RETURN EXISTS (
    SELECT 1 FROM public.savings_groups
    WHERE id = check_gid AND created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_gid AND user_id = auth.uid()
  );
END;
$$;

-- 2. Revamp group_members policies to be direct and non-recursive
DROP POLICY IF EXISTS "gm_access_v3" ON public.group_members;
DROP POLICY IF EXISTS "gm_select_own" ON public.group_members;
DROP POLICY IF EXISTS "gm_select_peers" ON public.group_members;

-- Allow users to see their own membership row
CREATE POLICY "gm_select_own" ON public.group_members
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow creators to see all members of their groups
CREATE POLICY "gm_select_creator" ON public.group_members
FOR SELECT TO authenticated
USING (
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);

-- Allow members to see other members (via the non-recursive function)
CREATE POLICY "gm_select_peers" ON public.group_members
FOR SELECT TO authenticated
USING (
  public.is_group_participant(group_id)
);

-- 3. Cleanup and strengthen policies for other tables using the function
-- GROUP CONTRIBUTIONS
DROP POLICY IF EXISTS "gc_access_v3" ON public.group_contributions;
CREATE POLICY "gc_select_final" ON public.group_contributions
FOR SELECT TO authenticated
USING (public.is_group_participant(group_id));

-- WALLETS
DROP POLICY IF EXISTS "wallet_access_v3" ON public.wallets;
CREATE POLICY "wallet_select_final" ON public.wallets
FOR SELECT TO authenticated
USING (
  group_id IN (
    SELECT id FROM public.savings_groups WHERE created_by = auth.uid()
    UNION
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

-- WITHDRAWALS
DROP POLICY IF EXISTS "wd_access_v3" ON public.withdrawals;
CREATE POLICY "wd_select_final" ON public.withdrawals
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR
  public.is_group_participant(group_id)
);

-- PAYOUTS
DROP POLICY IF EXISTS "po_access_v3" ON public.payouts;
CREATE POLICY "po_select_final" ON public.payouts
FOR SELECT TO authenticated
USING (public.is_group_participant(group_id));

-- 4. SAVINGS GROUPS (Ensure no recursion here either)
DROP POLICY IF EXISTS "gs_access_v3" ON public.savings_groups;
CREATE POLICY "gs_select_final" ON public.savings_groups
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR
  id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);
