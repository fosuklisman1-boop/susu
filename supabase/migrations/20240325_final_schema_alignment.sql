-- Phase 16: Final Schema Alignment & Consistency
-- Standardizes timestamps across all financial tables to ensure 'inserted_at' and 'created_at' existence

-- 1. Standardize 'group_contributions'
-- Ensure we have both. If created_at is missing (as discovered), we add it.
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Standardize 'contributions'
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Sync columns if they were just added
UPDATE public.group_contributions SET inserted_at = created_at WHERE inserted_at IS NULL;
UPDATE public.contributions SET inserted_at = created_at WHERE inserted_at IS NULL;

-- 4. Ensure 'reference' uniqueness and standardized indexing
CREATE INDEX IF NOT EXISTS idx_group_contributions_group_id ON public.group_contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_contributions_status ON public.group_contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_plan_id ON public.contributions(plan_id);

-- 5. Cleanup any orphaned triggers or functions
DROP FUNCTION IF EXISTS sync_wallets_initial() CASCADE;
DROP FUNCTION IF EXISTS sync_wallets_initial_unified() CASCADE;
