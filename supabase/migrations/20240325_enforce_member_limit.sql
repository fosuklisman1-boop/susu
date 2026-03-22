-- Migration: Enforce Member Limit via Trigger
-- Date: 2024-03-22

CREATE OR REPLACE FUNCTION check_group_member_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_max_members INTEGER;
    v_current_members INTEGER;
BEGIN
    -- Get the max members for the group
    SELECT max_members INTO v_max_members 
    FROM savings_groups 
    WHERE id = NEW.group_id;
    
    -- If no limit, allow
    IF v_max_members IS NULL OR v_max_members = 0 THEN
        RETURN NEW;
    END IF;

    -- Count existing members
    SELECT count(*) INTO v_current_members 
    FROM group_members 
    WHERE group_id = NEW.group_id;
    
    -- If limit reached, block
    IF v_current_members >= v_max_members THEN
        RAISE EXCEPTION 'Group has reached its maximum member limit of %', v_max_members;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Avoid duplicate triggers
DROP TRIGGER IF EXISTS trigger_check_group_member_limit ON group_members;

CREATE TRIGGER trigger_check_group_member_limit
BEFORE INSERT ON group_members
FOR EACH ROW
EXECUTE FUNCTION check_group_member_limit();
