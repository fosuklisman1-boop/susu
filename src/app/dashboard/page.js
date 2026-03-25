import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 1. Fetch ALL user's active plans (Standard + Challenge)
  const { data: allPlans } = await supabase
    .from('susu_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // 2. Separate into Matured vs Locked
  let lockedBalance = 0
  let maturedPlanSavings = 0
  const planSavings = {}
  const activePlans = [] // For display on dashboard (excluding challenges usually)

  allPlans?.forEach(plan => {
    const current = Number(plan.current_balance || 0)
    const target = Number(plan.target_amount || 0)
    const isMatured = current >= target

    if (isMatured) {
      maturedPlanSavings += current
    } else {
      lockedBalance += current
    }

    // Add to mapping for the UI
    planSavings[plan.id] = current
    
    // Most dashboard UIs only show "Standard" plans in the list, 
    // challenges have their own page, but let's keep it consistent.
    if (plan.plan_type !== 'pesewa_challenge') {
      activePlans.push(plan)
    }
  })

  // 3. Fetch user's individual wallet balance (direct top-ups minus withdrawals)
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle()

  const walletBalance = wallet?.balance ? Number(wallet.balance) : 0
  
  // 4. Available = Wallet + Matured Goals
  const availableBalance = walletBalance + maturedPlanSavings

  return (
    <DashboardClient 
      user={user}
      activePlans={activePlans}
      planSavings={planSavings}
      availableBalance={availableBalance}
      lockedBalance={lockedBalance}
    />
  )
}
