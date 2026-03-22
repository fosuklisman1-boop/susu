-- Phase 9: Non-Recursive RLS via Security Definer

-- 1. Helper function to check membership without recursion
-- SECURITY DEFINER allows the function to bypass RLS when querying group_members
CREATE OR REPLACE FUNCTION public.check_is_group_member(gid uuid, uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = gid
    AND group_members.user_id = uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop all previous SELECT policies on group_members
DROP POLICY IF EXISTS "Members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.group_members;
DROP POLICY IF EXISTS "Members can view fellow group members" ON public.group_members;
DROP POLICY IF EXISTS "select_own" ON public.group_members;

-- 3. Create fresh non-recursive policies for group_members
-- Allow users to see their own row (direct check)
CREATE POLICY "gm_select_own" ON public.group_members
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow members to see other members (via helper function)
CREATE POLICY "gm_select_peers" ON public.group_members
FOR SELECT TO authenticated
USING (public.check_is_group_member(group_id, auth.uid()));

-- 4. Sync Group Contributions policies
DROP POLICY IF EXISTS "Members can view group contributions" ON public.group_contributions;
DROP POLICY IF EXISTS "Members can view contributions" ON public.group_contributions;

CREATE POLICY "gc_select_members" ON public.group_contributions
FOR SELECT TO authenticated
USING (public.check_is_group_member(group_id, auth.uid()));

-- 5. Sync Withdrawals policies
DROP POLICY IF EXISTS "Users and Group Admins can view withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawals;

CREATE POLICY "wd_select_members" ON public.withdrawals
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR 
    public.check_is_group_member(group_id, auth.uid())
);

-- 6. Ensure Payouts follow the same logic
DROP POLICY IF EXISTS "Group members can view payouts" ON public.payouts;

CREATE POLICY "po_select_members" ON public.payouts
FOR SELECT TO authenticated
USING (public.check_is_group_member(group_id, auth.uid()));
