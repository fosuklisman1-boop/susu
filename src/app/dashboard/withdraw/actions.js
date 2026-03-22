import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createMomoWithdrawal } from '@/app/momo-actions/momo'

export async function createWithdrawal(prevState, formData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amount = Number(formData.get('amount'))
  const payoutMethod = formData.get('payout_method')
  const payoutDetails = formData.get('payout_details')
  const groupId = formData.get('groupId') // optional

  if (!amount || amount <= 0) return { error: 'Please enter a valid amount' }
  if (!payoutDetails) return { error: 'Please provide payout details' }

  let availableBalance = 0

  if (groupId) {
    // Group Withdrawal: Verify user is admin or creator
    const { data: group } = await supabase
      .from('savings_groups')
      .select('created_by')
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
      return { error: 'Admin access required for group withdrawals' }
    }

    // Calculate Group Balance
    const { data: grpPot } = await supabase.from('group_contributions').select('amount').eq('group_id', groupId).eq('status', 'success')
    const { data: grpWithdrawals } = await supabase.from('withdrawals').select('amount').eq('group_id', groupId).in('status', ['pending', 'approved', 'completed'])

    const totalIn = (grpPot || []).reduce((sum, c) => sum + Number(c.amount), 0)
    const totalOut = (grpWithdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0)
    availableBalance = Math.max(totalIn - totalOut, 0)
  } else {
    // User Withdrawal: Calculate Personal Balance
    const { data: stdContribs } = await supabase.from('contributions').select('amount').eq('user_id', user.id).eq('status', 'success')
    const { data: grpContribs } = await supabase.from('group_contributions').select('amount').eq('user_id', user.id).eq('status', 'success')
    const { data: userWithdrawals } = await supabase.from('withdrawals').select('amount').eq('user_id', user.id).is('group_id', null).in('status', ['pending', 'approved', 'completed'])

    const totalIn = [...(stdContribs || []), ...(grpContribs || [])].reduce((sum, c) => sum + Number(c.amount), 0)
    const totalOut = (userWithdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0)
    availableBalance = Math.max(totalIn - totalOut, 0)
  }

  if (amount > availableBalance) {
    return { error: 'Insufficient balance' }
  }

  // 2. Insert withdrawal request
  const { error: insertError } = await supabase
    .from('withdrawals')
    .insert({
      user_id: user.id,
      group_id: groupId || null,
      amount,
      payout_method: payoutMethod,
      payout_details: payoutDetails,
      status: 'pending'
    })

  if (insertError) {
    console.error('Withdrawal error:', insertError)
    return { error: 'Failed to submit request. Please try again.' }
  }

  // 3. If MoMo Direct, trigger automated payout
  if (payoutMethod === 'MTN MoMo (Direct)') {
    try {
      // Get the ID of the newly created withdrawal
      const { data: recentWd } = await supabase
        .from('withdrawals')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentWd) {
        await createMomoWithdrawal({
          amount,
          phoneNumber: payoutDetails, // Expecting just the number for direct MoMo
          withdrawalId: recentWd.id
        });
      }
    } catch (err) {
      console.error('Automated MoMo payout failed:', err);
      // We don't fail the whole action, since the request is already logged in DB
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/history')
  revalidatePath('/dashboard/withdraw')
  if (groupId) {
    revalidatePath(`/dashboard/group-savings/${groupId}`)
  }

  return { success: true, amount }
}
