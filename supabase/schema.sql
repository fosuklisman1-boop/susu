-- Database Schema for Ghana Susu App

-- 1. Create a table for Susu Plans
CREATE TABLE public.susu_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_amount NUMERIC(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    daily_contribution NUMERIC(10, 2) NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.susu_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans" 
ON public.susu_plans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans" 
ON public.susu_plans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Create a table for Contributions
CREATE TABLE public.contributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES public.susu_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_reference TEXT UNIQUE, -- Paystack reference
    status TEXT DEFAULT 'success',
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contributions" 
ON public.contributions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service roles can insert contributions (Webhooks)" 
ON public.contributions FOR INSERT 
WITH CHECK (true); -- Usually restricted to service role in actual implementation

-- 3. Automatic End Date Trigger Function
CREATE OR REPLACE FUNCTION calculate_end_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.end_date := NEW.start_date + (NEW.duration_days || ' days')::interval;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_end_date
BEFORE INSERT OR UPDATE ON public.susu_plans
FOR EACH ROW
EXECUTE FUNCTION calculate_end_date();

-- 4. Group Savings Engine --

CREATE TABLE public.savings_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    group_type TEXT NOT NULL CHECK (group_type IN ('rotating', 'contribution', 'challenge')),
    invite_code TEXT UNIQUE NOT NULL, -- 6 character alphanumeric
    target_amount NUMERIC(10, 2), -- Optional depending on group type
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE public.group_contributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_reference TEXT UNIQUE,
    status TEXT DEFAULT 'success',
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for Groups
ALTER TABLE public.savings_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view a group if they have the invite code or are a member" 
ON public.savings_groups FOR SELECT USING (true);

CREATE POLICY "Users can create groups" 
ON public.savings_groups FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view other members" 
ON public.group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE user_id = auth.uid() AND group_id = public.group_members.group_id)
);

CREATE POLICY "Users can join groups" 
ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view contributions" 
ON public.group_contributions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE user_id = auth.uid() AND group_id = public.group_contributions.group_id)
);

-- 5. Add Plan Type column to distinct specialized challenges --
ALTER TABLE public.susu_plans ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'standard';

-- 6. Add Frequency column to support PesewaBox Pay Plans --
ALTER TABLE public.susu_plans ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily';

-- 7. Add Name column to susu_plans for PesewasBox purpose --
ALTER TABLE public.susu_plans ADD COLUMN IF NOT EXISTS name TEXT;

-- 8. Extra columns for savings_groups --
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS contribution_amount NUMERIC(10,2);
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS max_members INTEGER;

-- 9. Fix group_members joined_at alias (some schemas use created_at) --
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 10. Add payout and date columns to savings_groups --
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS payout_method TEXT;
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS is_fixed_contribution BOOLEAN DEFAULT TRUE;
ALTER TABLE public.savings_groups ADD COLUMN IF NOT EXISTS min_contribution_amount NUMERIC(10,2) DEFAULT 0;

-- 11. Support anonymous contributions (no account required) --
ALTER TABLE public.group_contributions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS contributor_name TEXT;
ALTER TABLE public.group_contributions ADD COLUMN IF NOT EXISTS contributor_email TEXT;

-- 12. Support rotating group payout order --
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS payout_order INTEGER;

-- 13. Support withdrawal requests --
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payout_method TEXT NOT NULL, -- e.g. Mobile Money, Bank
    payout_details TEXT NOT NULL, -- e.g. Phone number, Account details
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawals" 
ON public.withdrawals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawals" 
ON public.withdrawals FOR INSERT 
WITH CHECK (auth.uid() = user_id);
