-- Pro-Level Proper Functionality Schema
-- Adds missing persistence for advanced business logic (Payouts, Saved Methods, Audit Logs, Referrals)

-- 1. Payouts Table (Crucial for Rotating Groups and Withdrawal tracking)
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Receiver
    amount NUMERIC(12, 2) NOT NULL,
    cycle_number INTEGER, -- For rotating groups (Cycle 1, Cycle 2, etc.)
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    payout_date TIMESTAMPTZ DEFAULT NOW(),
    reference_id UUID REFERENCES public.withdrawals(id) ON DELETE SET NULL, -- Link to the withdrawal request
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Saved Payment Methods (For quick MoMo or Bank withdrawals)
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'momo_mtn', 'momo_airteltigo', 'bank_ghana'
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, account_number)
);

-- 3. Audit Logs (For critical admin or system actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'update_group_settings', 'suspend_user', 'manual_balance_adjustment'
    target_table TEXT,
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Referrals Table (Growth Engine)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_email TEXT NOT NULL,
    joined_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'rewarded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referrer_id, referred_email)
);

-- 5. User Preferences (Settings persistence)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT DEFAULT 'en',
    currency TEXT DEFAULT 'GHS',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    dark_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Trigger to auto-create preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_prefs() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_prefs
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_prefs();

-- Backfill preferences
INSERT INTO public.user_preferences (user_id)
SELECT id FROM auth.users ON CONFLICT (user_id) DO NOTHING;

-- 7. RLS Policies
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Payouts: Viewable by group members
CREATE POLICY "Group members can view payouts" ON public.payouts
FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- Payment Methods: Only owners can see/edit
CREATE POLICY "Users can manage own payment methods" ON public.user_payment_methods
FOR ALL USING (auth.uid() = user_id);

-- Referrals: Only owners can see their referrals
CREATE POLICY "Users can view own referrals" ON public.referrals
FOR SELECT USING (auth.uid() = referrer_id);

-- Preferences: Only owners can see/edit
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
FOR ALL USING (auth.uid() = user_id);

-- Audit Logs: Admin only (Service Role or strict check)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('admin@susu.local')
);
