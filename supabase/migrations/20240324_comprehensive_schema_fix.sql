-- Comprehensive Schema Fix for Missing Tables and Columns
-- Executing this script will provide 'proper functionality' for missing feature integrations
-- Ensures idempotent execution via IF NOT EXISTS

-- 1. Public Users Table (Crucial for querying users by email without bypassing RLS to auth schema)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
CREATE POLICY "Public users are viewable by everyone" 
ON public.users FOR SELECT USING (true); -- Required for email lookups during invites

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Trigger to sync auth.users with public.users automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill public.users for existing auth accounts
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users 
ON CONFLICT (id) DO NOTHING;

-- 3. Site Settings Table (For dynamic contact info and WhatsApp links)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    support_phone TEXT DEFAULT '+233000000000',
    whatsapp_group_link TEXT,
    whatsapp_channel_link TEXT,
    admin_email TEXT DEFAULT 'admin@susu.local',
    maintenance_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize default single row
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON public.site_settings;
CREATE POLICY "Anyone can read settings" 
ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can update settings" ON public.site_settings;
CREATE POLICY "Only admins can update settings" 
ON public.site_settings FOR UPDATE USING (
    -- Simple admin check based on email for lack of a formal roles table
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('admin@susu.local')
);

-- 4. Notifications Table (For user alerts on plan/group activity)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    action_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" 
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" 
ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 5. Automatically create notifications for Payments and Withdrawals via Trigger extension
CREATE OR REPLACE FUNCTION notify_user_on_ledger_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on newly inserted success/completed/failed items
    IF (TG_OP = 'INSERT') THEN
        IF NEW.type = 'plan_deposit' AND NEW.status = 'success' THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Payment Successful', 'Your plan contribution of GHS ' || NEW.amount || ' was successful.', 'payment');
        ELSIF NEW.type = 'group_deposit' AND NEW.status = 'success' AND NEW.user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Group Contribution Received', 'Your group deposit of GHS ' || NEW.amount || ' was successfully added to the pot.', 'group');
        ELSIF NEW.type = 'withdrawal' THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Withdrawal Update', 'Your withdrawal request of GHS ' || NEW.amount || ' is currently ' || NEW.status || '.', 'withdrawal');
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status != NEW.status AND NEW.type = 'withdrawal' THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Withdrawal ' || INITCAP(NEW.status), 'Your withdrawal request for GHS ' || NEW.amount || ' has been marked as ' || NEW.status || '.', 'withdrawal');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_user_on_ledger_entry ON transactions;
CREATE TRIGGER tr_notify_user_on_ledger_entry 
    AFTER INSERT OR UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION notify_user_on_ledger_entry();
