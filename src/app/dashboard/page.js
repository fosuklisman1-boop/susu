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

  // Fetch contributions for all plans (Now using persistent current_balance)
  let planSavings = {};
  activePlans?.forEach(plan => {
    planSavings[plan.id] = Number(plan.current_balance || 0);
  });

  // 3. Fetch user's individual balance from the wallets table
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const availableBalance = wallet?.balance ? Number(wallet.balance) : 0;

  return (
    <DashboardClient 
      user={user}
      activePlans={activePlans}
      planSavings={planSavings}
      availableBalance={availableBalance}
    />
  )
}
