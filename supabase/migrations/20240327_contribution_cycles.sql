-- Add cycle_number to group_contributions to track which cycle a payment belongs to
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS cycle_number INTEGER;

-- Update existing records to cycle 1 if they don't have one (sensible default for migration)
UPDATE public.group_contributions SET cycle_number = 1 WHERE cycle_number IS NULL;

-- Index for performance when tracking status
CREATE INDEX IF NOT EXISTS idx_group_contributions_cycle ON public.group_contributions(group_id, cycle_number);
