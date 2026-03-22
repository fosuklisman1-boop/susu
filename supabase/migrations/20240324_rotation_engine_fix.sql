-- Rotation Engine Tweak
-- Adds current_cycle to savings_groups to track progress in Rotating/ROSCA groups

ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS current_cycle INTEGER DEFAULT 1;

-- Update existing rotating groups to cycle 1 if null
UPDATE public.savings_groups SET current_cycle = 1 WHERE group_type = 'rotating' AND current_cycle IS NULL;
