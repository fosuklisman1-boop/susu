import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Fetch ALL user's active standard plans (exclude pesewa_challenge type)
  const { data: activePlans } = await supabase
    .from('susu_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .neq('plan_type', 'pesewa_challenge')
    .order('created_at', { ascending: false })

  // Fetch contributions for all plans
  let planSavings = {}
  if (activePlans?.length) {
    const { data: contributions } = await supabase
      .from('contributions')
      .select('plan_id, amount')
      .in('plan_id', activePlans.map(p => p.id))
      .eq('status', 'success')
    contributions?.forEach(c => {
      planSavings[c.plan_id] = (planSavings[c.plan_id] || 0) + Number(c.amount)
    })
  }

  // 3. Fetch user's individual contributions to any groups
  const { data: grpContribs } = await supabase
    .from('group_contributions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('status', 'success')
  
  const totalInPlans = Object.values(planSavings).reduce((sum, v) => sum + v, 0)
  const totalInGroups = (grpContribs || []).reduce((sum, c) => sum + Number(c.amount), 0)
  const totalIn = totalInPlans + totalInGroups

  // 4. Fetch Withdrawals (pending, approved, completed)
  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('user_id', user.id)
    .is('group_id', null) // Only personal withdrawals subtract from personal balance
    .in('status', ['pending', 'approved', 'completed'])

  const totalOut = (withdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0)
  const availableBalance = Math.max(totalIn - totalOut, 0)

  return (
    <DashboardClient 
      user={user}
      activePlans={activePlans}
      planSavings={planSavings}
      availableBalance={availableBalance}
    />
  )
}
