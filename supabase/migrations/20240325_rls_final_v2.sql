-- Phase 11 & 12: ULTIMATE RLS FIX
-- This script updates the existing function WITHOUT changing its signature (parameter names),
-- which avoids the "cannot change name" and "dependency" errors.

-- 1. Update the function logic in-place
CREATE OR REPLACE FUNCTION public.check_is_group_member(gid uuid, uid uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = gid
    AND group_members.user_id = uid
  );
END;
$$;

-- 2. Broaden policies (this is safe even if they exist)
DROP POLICY IF EXISTS "gc_select_members" ON public.group_contributions;
CREATE POLICY "gc_select_members" ON public.group_contributions
FOR SELECT TO authenticated
USING (
  public.check_is_group_member(group_id, auth.uid())
  OR
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);

DROP POLICY IF EXISTS "Group members can view their group wallet" ON public.wallets;
CREATE POLICY "Group members can view their group wallet" ON public.wallets
FOR SELECT TO authenticated
USING (
  public.check_is_group_member(group_id, auth.uid())
  OR
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);

-- 3. Also ensure "Recent Contributions" shows for Rotating/Challenge groups too
-- I will update the frontend code to show the history for ALL group types.
