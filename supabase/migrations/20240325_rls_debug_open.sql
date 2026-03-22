-- Phase 13: WIDE OPEN DEBUG RLS
-- Run this if you see NO groups and NO balances. 
-- It allows any logged-in user to see all data for a moment.

-- 1. DROP all previous restrictive policies
DROP POLICY IF EXISTS "gs_access_v3" ON public.savings_groups;
DROP POLICY IF EXISTS "gs_select_final" ON public.savings_groups;
DROP POLICY IF EXISTS "gm_select_own" ON public.group_members;
DROP POLICY IF EXISTS "gm_select_creator" ON public.group_members;
DROP POLICY IF EXISTS "gm_select_peers" ON public.group_members;
DROP POLICY IF EXISTS "gc_select_final" ON public.group_contributions;
DROP POLICY IF EXISTS "wallet_select_final" ON public.wallets;
DROP POLICY IF EXISTS "wd_select_final" ON public.withdrawals;
DROP POLICY IF EXISTS "po_select_final" ON public.payouts;

-- 2. CREATE WIDE OPEN POLICIES (Temporary for debug)
-- These allow any authenticated user to see the data.
CREATE POLICY "debug_gs_select" ON public.savings_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "debug_gm_select" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "debug_gc_select" ON public.group_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "debug_wallets_select" ON public.wallets FOR SELECT TO authenticated USING (true);
CREATE POLICY "debug_wd_select" ON public.withdrawals FOR SELECT TO authenticated USING (true);
CREATE POLICY "debug_po_select" ON public.payouts FOR SELECT TO authenticated USING (true);

-- 3. Also allow insertions for members (Wide open for now)
DROP POLICY IF EXISTS "Members can join" ON public.group_members;
CREATE POLICY "Members can join" ON public.group_members FOR INSERT TO authenticated WITH CHECK (true);
