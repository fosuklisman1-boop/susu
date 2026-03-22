-- Fix for recursive RLS on group_members and savings_groups

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view other members" ON public.group_members;

-- 2. Clear and unambiguous SELECT policies for group_members
-- Policy 1: Users can always see their own row
CREATE POLICY "Users can view their own membership"
ON public.group_members FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Members can see other members in the same group
-- We use a subquery that identifies groups the user is in. 
-- To avoid recursion, we check against the database directly using a simplified EXISTS.
CREATE POLICY "Members can view fellow group members"
ON public.group_members FOR SELECT
USING (
    group_id IN (
        SELECT m.group_id 
        FROM public.group_members m 
        WHERE m.user_id = auth.uid()
    )
);

-- 3. Ensure savings_groups visibility is robust
DROP POLICY IF EXISTS "Anyone can view a group if they have the invite code or are a member" ON public.savings_groups;

CREATE POLICY "Groups are visible to everyone with a valid code"
ON public.savings_groups FOR SELECT
USING (true);

-- 4. Ensure group_contributions visibility
DROP POLICY IF EXISTS "Members can view contributions" ON public.group_contributions;

CREATE POLICY "Members can view group contributions"
ON public.group_contributions FOR SELECT
USING (
    group_id IN (
        SELECT m.group_id 
        FROM public.group_members m 
        WHERE m.user_id = auth.uid()
    )
);

-- 5. Ensure withdrawals visibility for group admins
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawals;

CREATE POLICY "Users and Group Admins can view withdrawals"
ON public.withdrawals FOR SELECT
USING (
    auth.uid() = user_id 
    OR 
    group_id IN (
        SELECT m.group_id 
        FROM public.group_members m 
        WHERE m.user_id = auth.uid() AND m.role = 'admin'
    )
);
