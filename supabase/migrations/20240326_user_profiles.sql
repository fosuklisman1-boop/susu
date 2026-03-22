-- Migration to create profiles table and handle automatic creation on signup

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 4. Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Add direct relationships for easier joining
ALTER TABLE public.group_members 
  DROP CONSTRAINT IF EXISTS fk_member_profile,
  ADD CONSTRAINT fk_member_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.group_contributions
  DROP CONSTRAINT IF EXISTS fk_contribution_profile,
  ADD CONSTRAINT fk_contribution_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.withdrawals
  DROP CONSTRAINT IF EXISTS fk_withdrawal_profile,
  ADD CONSTRAINT fk_withdrawal_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 7. Backfill existing users
INSERT INTO public.profiles (id, full_name, phone_number)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', substring(email from '(.*)@')), COALESCE(raw_user_meta_data->>'phone_number', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
