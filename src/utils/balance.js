import { createClient } from '@/utils/supabase/server'

/**
 * Calculates Available and Locked balances for a user.
 * Available = Wallet Balance + Matured Plans (100% target reached)
 * Locked = Sum of current_balance for un-matured plans.
 */
export async function getUserBalances(userId) {
  const supabase = await createClient()

  // 1. Fetch Wallet Balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()
  
  const walletBalance = Number(wallet?.balance || 0)

  // 2. Fetch all active Susu plans
  const { data: plans } = await supabase
    .from('susu_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')

  let maturedBalance = 0
  let lockedBalance = 0

  plans?.forEach(plan => {
    const current = Number(plan.current_balance || 0)
    const target = Number(plan.target_amount || 0)
    
    if (current >= target && target > 0) {
      maturedBalance += current
    } else {
      lockedBalance += current
    }
  })

  return {
    availableBalance: walletBalance + maturedBalance,
    lockedBalance: lockedBalance,
    allPlans: plans || []
  }
}
