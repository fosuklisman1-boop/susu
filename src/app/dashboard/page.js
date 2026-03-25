import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 1. Fetch available and locked balances via SQL RPC
  const { data: availableBalance, error: availError } = await supabase.rpc('get_available_balance', { u_id: user.id })
  const { data: lockedBalance, error: lockError } = await supabase.rpc('get_locked_balance', { u_id: user.id })

  if (availError) console.error('Error fetching available balance:', availError)
  if (lockError) console.error('Error fetching locked balance:', lockError)

  // 2. Fetch ALL user's active plans for UI display
  const { data: allPlans } = await supabase
    .from('susu_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const planSavings = {}
  const activePlans = []
  allPlans?.forEach(plan => {
    planSavings[plan.id] = Number(plan.current_balance || 0)
    if (plan.plan_type !== 'pesewa_challenge') {
      activePlans.push(plan)
    }
  })

  return (
    <DashboardClient 
      user={user}
      activePlans={activePlans}
      planSavings={planSavings}
      availableBalance={Number(availableBalance || 0)}
      lockedBalance={Number(lockedBalance || 0)}
    />
  )
}
