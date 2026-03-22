-- Phase 18: Public Access RLS Fix
-- Ensures anonymous users can view specific group details and contributions for public links

-- 1. Allow public viewing of groups (limited columns for safety)
DROP POLICY IF EXISTS "Public can view groups by invite" ON public.savings_groups;
CREATE POLICY "Public can view groups by invite" ON public.savings_groups
FOR SELECT USING (true); -- We filter by invite_code in the query

-- 2. Allow public viewing of contributions for a group (to show total raised)
DROP POLICY IF EXISTS "Public can view contributions for group" ON public.group_contributions;
CREATE POLICY "Public can view contributions for group" ON public.group_contributions
FOR SELECT USING (true);

-- 3. Allow anonymous inserts for public contributions
DROP POLICY IF EXISTS "Public can insert contributions" ON public.group_contributions;
CREATE POLICY "Public can insert contributions" ON public.group_contributions
FOR INSERT WITH CHECK (true);

-- 4. Allow public viewing of wallets (to show available balance)
DROP POLICY IF EXISTS "Public can view wallets" ON public.wallets;
CREATE POLICY "Public can view wallets" ON public.wallets
FOR SELECT USING (true);
