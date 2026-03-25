-- 1. Function to get AVAILABLE (withdrawable) balance for a user
-- Available = Wallet Balance + All Matured Plans (Target Reached)
CREATE OR REPLACE FUNCTION get_available_balance(u_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    wallet_bal DECIMAL := 0;
    matured_bal DECIMAL := 0;
BEGIN
    -- Wallet balance from direct top-ups minus standalone withdrawals
    SELECT COALESCE(balance, 0) INTO wallet_bal FROM wallets WHERE user_id = u_id;
    
    -- Matured plans: where current_balance >= target_amount (Goal Reached)
    SELECT COALESCE(SUM(current_balance), 0) INTO matured_bal 
    FROM susu_plans 
    WHERE user_id = u_id AND status = 'active' AND current_balance >= target_amount;
    
    RETURN COALESCE(wallet_bal, 0) + COALESCE(matured_bal, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get LOCKED balance for a user
-- Locked = Sum of current_balance for all plans where Goal is NOT 100% reached
CREATE OR REPLACE FUNCTION get_locked_balance(u_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    locked_bal DECIMAL := 0;
BEGIN
    SELECT COALESCE(SUM(current_balance), 0) INTO locked_bal 
    FROM susu_plans 
    WHERE user_id = u_id AND status = 'active' AND current_balance < target_amount;
    
    RETURN COALESCE(locked_bal, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Explicitly Grant Execution Permissions 
-- Required for calling from the supabase-js client
GRANT EXECUTE ON FUNCTION get_available_balance(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_locked_balance(UUID) TO authenticated, service_role;
