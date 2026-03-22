-- Add status column to savings_groups
-- Possible values: 'active', 'closed'
ALTER TABLE public.savings_groups 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add a comment for clarity
COMMENT ON COLUMN public.savings_groups.status IS 'Lifecycle status of the group. active = accepting contributions, closed = no more contributions allowed.';

-- Index for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_savings_groups_status ON public.savings_groups(status);
