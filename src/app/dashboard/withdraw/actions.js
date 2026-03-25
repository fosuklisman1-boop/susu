'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createMomoWithdrawal } from '@/app/momo-actions/momo'
import { savePaymentMethod } from '@/app/actions/user'

export async function createWithdrawal(prevState, formData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amount = Number(formData.get('amount'))
  const payoutMethod = formData.get('payout_method')
  const payoutDetails = formData.get('payout_details')
  const groupId = formData.get('groupId') // optional
  const saveAccount = formData.get('save_account') === 'on' || formData.get('save_account') === 'true'

  if (!amount || amount <= 0) return { error: 'Please enter a valid amount' }
  if (!payoutDetails) return { error: 'Please provide payout details' }

  // 1. If saveAccount is true, persist it
  if (saveAccount) {
    await savePaymentMethod(
      payoutMethod.includes('MoMo') ? 'momo_mtn' : 'bank_ghana', 
      payoutDetails, 
      user.email, // Use email as account name fallback
      true // set as default
    )
  }

  let availableBalance = 0;

  if (groupId) {
    // 1a. Group Withdrawal Auth
    const { data: group } = await supabase.from('savings_groups').select('created_by').eq('id', groupId).single();
    const { data: member } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).single();
    
    if (group?.created_by !== user.id && member?.role !== 'admin') {
      return { error: 'Admin access required for group withdrawals' };
    }

    // 1b. Get Group Wallet Balance
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('group_id', groupId).maybeSingle();
    availableBalance = wallet?.balance ? Number(wallet.balance) : 0;
  } else {
    // 1c. Get Personal Available Balance via Robust SQL logic
    const { data: balanceResult } = await supabase.rpc('get_available_balance', { u_id: user.id });
    availableBalance = Number(balanceResult || 0);
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
