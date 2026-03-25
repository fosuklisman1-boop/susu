import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { getUserBalances } from '@/utils/balance'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 1. Fetch available and locked balances via refined JS utility
  const { availableBalance, lockedBalance, allPlans } = await getUserBalances(user.id)

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
