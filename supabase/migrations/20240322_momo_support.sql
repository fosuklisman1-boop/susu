-- Migration to support direct MTN MoMo Integration

-- 1. Update susu_plans to support automated pre-approval
ALTER TABLE public.susu_plans ADD COLUMN IF NOT EXISTS momo_pre_approval_id TEXT;

-- 2. Update contributions to support multiple providers
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paystack';
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS provider_reference TEXT;

-- 3. Update group_contributions to match
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paystack';
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS provider_reference TEXT;

-- 4. Update withdrawals to support MoMo transaction tracking
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS momo_transfer_id TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 5. Add a flag for automated savings
ALTER TABLE public.susu_plans ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE;

-- Ensure RLS allows the service role to update these columns if needed
-- (Existing policies usually cover user-level access)
