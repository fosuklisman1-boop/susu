-- Migration to add missing RLS policies for payouts
-- This ensures admins can record payouts even without the Service Role (though the action uses it for reliability)

-- Allow admins to insert payouts
CREATE POLICY "po_insert_admins" ON public.payouts
FOR INSERT TO authenticated
WITH CHECK (
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);

-- Allow admins to update payouts (e.g. status)
CREATE POLICY "po_update_admins" ON public.payouts
FOR UPDATE TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
)
WITH CHECK (
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  group_id IN (SELECT id FROM public.savings_groups WHERE created_by = auth.uid())
);
