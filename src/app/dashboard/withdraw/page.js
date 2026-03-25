import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import WithdrawClient from './WithdrawClient'
import { getUserPaymentMethods } from '@/app/actions/user'

export default async function WithdrawPage({ searchParams }) {
  const { groupId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let availableBalance = 0
  let isGroup = false
  let groupName = null

  if (groupId) {
    // 1. Fetch group to check creator and member roles
    const { data: group } = await supabase
      .from('savings_groups')
      .select('name, created_by')
      .eq('id', groupId)
      .single()

    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    const isAuthorized = group?.created_by === user.id || member?.role === 'admin'

    if (!isAuthorized) {
      redirect('/dashboard?error=Admin+access+required')
    }

    isGroup = true
    groupName = group?.name

    // 2. Total Group Pot (all successful contributions to this group)
    const { data: grpPot } = await supabase
      .from('group_contributions')
      .select('amount')
      .eq('group_id', groupId)
      .eq('status', 'success')

    // 3. Existing Group Withdrawals
    const { data: grpWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('group_id', groupId)
      .in('status', ['pending', 'approved', 'completed'])

    const totalIn = (grpPot || []).reduce((sum, c) => sum + Number(c.amount), 0)
    const totalOut = (grpWithdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0)
    availableBalance = Math.max(totalIn - totalOut, 0)
  } else {
    // Standard User Balance logic: Use the robust SQL RPC function
    const { data: balanceResult } = await supabase.rpc('get_available_balance', { u_id: user.id })
    availableBalance = Number(balanceResult || 0)
  }

  const savedMethods = await getUserPaymentMethods()

  return (
    <WithdrawClient 
      availableBalance={availableBalance} 
      userEmail={user.email} 
      groupId={groupId}
      groupName={groupName}
      isGroup={isGroup}
      savedMethods={savedMethods}
    />
  )
}
