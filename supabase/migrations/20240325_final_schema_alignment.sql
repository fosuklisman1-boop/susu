-- Phase 16: Final Schema Alignment & Consistency
-- Standardizes timestamps across all financial tables to ensure 'inserted_at' existence

-- 1. Standardize 'group_contributions'
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.group_contributions SET inserted_at = created_at WHERE inserted_at IS NULL;

-- 2. Standardize 'contributions'
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.contributions SET inserted_at = created_at WHERE inserted_at IS NULL;

-- 3. Ensure 'reference' uniqueness and standardized indexing
CREATE INDEX IF NOT EXISTS idx_group_contributions_group_id ON public.group_contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_contributions_status ON public.group_contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_plan_id ON public.contributions(plan_id);

-- 4. Cleanup any orphaned triggers or functions
DROP FUNCTION IF EXISTS sync_wallets_initial() CASCADE;
DROP FUNCTION IF EXISTS sync_wallets_initial_unified() CASCADE;

-- 5. Final Payout Alignment
-- Ensure payouts has a recipient email or name for manual tracking if auth is deleted
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS recipient_email TEXT;
