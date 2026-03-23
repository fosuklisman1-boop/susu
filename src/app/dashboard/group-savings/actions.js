'use server'

import { createClient, createServiceRoleClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * GROUP SAVINGS LOGIC
 * 
 * 1. ROTATING (ROSCA - Rotating Savings & Credit Association):
 *    - All members contribute the same fixed amount each period (weekly/monthly)
 *    - The total pot (members × contribution) is paid out to ONE member per cycle
 *    - Order of payout rotates through all members until everyone has received once
 *    - Example: 5 members × GHS 200/month = GHS 1,000 pot. 
 *               Month 1 → Member A gets GHS 1,000
 *               Month 2 → Member B gets GHS 1,000 ... etc.
 *
 * 2. CONTRIBUTION (Shared Pot):
 *    - All members contribute freely toward a shared collective goal
 *    - The total amount pooled together reaches the group's target
 *    - Used for a shared purpose (e.g. group vacation, event, common purchase)
 *    - Example: 10 members targeting GHS 5,000 total, each contributes what they can
 *
 * 3. CHALLENGE (Public Group Challenge):
 *    - Each member individually saves toward the same personal goal amount
 *    - All members can see each other's progress (motivational/competitive)
 *    - Example: 20 members each targeting GHS 1,000 by end of year
 */

export async function createGroup(prevState, formData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const groupType = formData.get('group_type')
  const name = formData.get('name')?.trim()
  const targetAmount = formData.get('target_amount') || null
  const contributionAmount = formData.get('contribution_amount') || null
  const frequency = formData.get('frequency') || null
  const maxMembers = formData.get('max_members') || null
  const payoutMethod = formData.get('payout_method') || null
  const startDate = formData.get('startDate') || null
  const endDate = formData.get('endDate') || null
  const isFixed = formData.get('is_fixed_contribution') === 'true'
  const minAmount = formData.get('min_contribution_amount') || 0

  if (!name || !groupType) {
    return { error: 'Please provide a group name and savings type.' }
  }

  // Rotating groups need a contribution amount
  if (groupType === 'rotating' && !contributionAmount) {
    return { error: 'Please enter the amount required per member.' }
  }

  // Challenge groups still need a target amount usually, but we relax it for contribution groups
  if (groupType === 'challenge' && !targetAmount) {
    return { error: 'Please enter the expected goal amount per member.' }
  }

  const inviteCode = generateInviteCode()

  const { data: newGroup, error: groupError } = await supabase
    .from('savings_groups')
    .insert({
      name,
      group_type: groupType,
      target_amount: targetAmount,
      contribution_amount: contributionAmount,
      frequency,
      payout_method: payoutMethod,
      start_date: startDate,
      end_date: endDate,
      is_fixed_contribution: isFixed,
      min_contribution_amount: minAmount,
      max_members: groupType === 'rotating' ? (maxMembers ? Number(maxMembers) : null) : null,
      invite_code: inviteCode,
      created_by: user.id
    })
    .select()
    .single()

  if (groupError || !newGroup) {
    console.error('Failed to create group', groupError)
    return { error: `Could not create group: ${groupError?.message}` }
  }

  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: newGroup.id,
    user_id: user.id,
    role: 'admin',
    payout_order: groupType === 'rotating' ? 1 : null
  })

  if (memberError) {
    return { error: 'Group created but could not add you as admin.' }
  }

  revalidatePath('/dashboard/group-savings')
  return { success: true, groupId: newGroup.id, inviteCode, groupType, name }
}

export async function joinGroup(prevState, formData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const inviteCode = formData.get('invite_code')?.toUpperCase()?.trim()

  if (!inviteCode) return { error: 'Please enter an invite code.' }

  const { data: group, error: findError } = await supabase
    .from('savings_groups')
    .select('id, name, group_type, max_members, status, start_date, frequency, end_date')
    .eq('invite_code', inviteCode)
    .single()

  if (findError || !group) {
    return { error: `No group found with code "${inviteCode}". Please check and try again.` }
  }

  // 0. Check if group is closed or expired
  const isClosed = group.status === 'closed'
  const isExpired = (() => {
    if (group.end_date && new Date() > new Date(group.end_date)) return true
    if (group.start_date && group.frequency && !isNaN(Number(group.frequency))) {
      const start = new Date(group.start_date)
      const durationDays = Number(group.frequency)
      const end = new Date(start)
      end.setDate(end.getDate() + durationDays)
      return new Date() > end
    }
    return false
  })()

  if (isClosed) return { error: `Sorry, this group is closed for new members.` }
  if (isExpired) return { error: `Sorry, this group goal duration has ended.` }

  // 1. Check if group is full (ONLY for rotating groups)
  if (group.group_type === 'rotating' && group.max_members) {
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
    
    if ((count || 0) >= group.max_members) {
      return { error: `Sorry, this group has reached its maximum limit of ${group.max_members} members.` }
    }
  }

  // 2. Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return { error: existing.role === 'admin'
      ? `You created this group — you are already the admin.`
      : `You are already a member of "${group.name}".`
    }
  }

  // For rotating groups, assign the next payout order
  let nextOrder = null
  if (group.group_type === 'rotating') {
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
    nextOrder = (count || 0) + 1
  }

  const { error: joinError } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'member',
    payout_order: nextOrder
  })

  if (joinError) {
    if (joinError.code === '23505') {
      return { success: true, groupId: group.id, groupName: group.name, alreadyMember: true }
    }
    console.error('Join group error:', joinError)
    return { error: `Could not join group: ${joinError.message}` }
  }

  // Phase 36: Auto-start rotating groups when full
  if (group.group_type === 'rotating' && group.max_members && nextOrder === Number(group.max_members)) {
    const adminSupabase = await createServiceRoleClient()
    
    // Calculate first payout date (Now + Frequency)
    let freqDays = 7
    if (group.frequency === 'daily') freqDays = 1
    if (group.frequency === 'weekly') freqDays = 7
    if (group.frequency === 'bi-weekly') freqDays = 14
    if (group.frequency === 'monthly') freqDays = 30

    const initialStartDate = new Date()
    initialStartDate.setDate(initialStartDate.getDate() + freqDays)

    const { error: startError } = await adminSupabase
      .from('savings_groups')
      .update({ start_date: initialStartDate.toISOString() })
      .eq('id', group.id)
    if (startError) console.error('Failed to set group start_date while full', startError)
  }

  revalidatePath('/dashboard/group-savings')
  return { success: true, groupId: group.id, groupName: group.name }
}

export async function updateGroup(prevState, formData) {
  const supabase = await createClient()
  console.log('--- START updateGroup ACTION ---')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const groupId = formData.get('groupId')
  const name = formData.get('name')
  const targetAmount = formData.get('target_amount')
  const contributionAmount = formData.get('contribution_amount')
  const frequency = formData.get('frequency')
  const maxMembers = formData.get('max_members')
  const payoutMethod = formData.get('payout_method')
  const isFixedRaw = formData.get('is_fixed_contribution')
  const isFixed = isFixedRaw === 'true' || isFixedRaw === 'on' || isFixedRaw === true
  const minAmount = formData.get('min_contribution_amount') || 0

  if (!groupId || !name) {
    return { error: 'Group ID and Name are required.' }
  }

  // Verify Admin or Creator
  const { data: group, error: fetchError } = await supabase
    .from('savings_groups')
    .select('created_by, group_type')
    .eq('id', groupId)
    .single()

  console.log('AUTH CHECK - GROUP:', { group, fetchError, userId: user.id })

  if (fetchError || !group) return { error: 'Group not found.' }

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  console.log('AUTH CHECK - MEMBER:', { member })

  const isAuthorized = group.created_by === user.id || member?.role === 'admin'

  if (!isAuthorized) {
    console.log('AUTHORIZATION FAILED')
    return { error: 'Only administrators can update group settings.' }
  }

  const updateFields = {
    name,
    target_amount: (targetAmount !== '' && targetAmount !== null) ? Number(targetAmount) : null,
    contribution_amount: (contributionAmount !== '' && contributionAmount !== null) ? Number(contributionAmount) : null,
    frequency,
    max_members: (maxMembers !== '' && maxMembers !== null) ? Number(maxMembers) : null,
    payout_method: payoutMethod,
    is_fixed_contribution: isFixed,
    min_contribution_amount: (minAmount !== '' && minAmount !== null) ? Number(minAmount) : 0,
    max_members: group.group_type === 'rotating' ? (maxMembers !== '' && maxMembers !== null ? Number(maxMembers) : null) : null,
    updated_at: new Date().toISOString()
  }

  console.log('UPDATING GROUP FIELDS:', updateFields)

  const { data: updateData, error: updateError } = await supabase
    .from('savings_groups')
    .update(updateFields)
    .eq('id', groupId)
    .select()

  if (updateError) {
    console.error('Update group error:', updateError)
    return { error: 'Failed to update group. Please try again.' }
  }

  console.log('UPDATE SUCCESSFUL:', updateData)

  revalidatePath(`/dashboard/group-savings/${groupId}`)
  revalidatePath(`/dashboard/group-savings/${groupId}/settings`)
  revalidatePath('/dashboard/group-savings')

  return { success: true }
}

export async function recordGroupPayout(groupId, userId, amount, cycleNumber) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  
  // Verify Admin
  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
    
  if (member?.role !== 'admin') return { error: 'Only admins can record payouts.' }
  
  const adminSupabase = await createServiceRoleClient()
  
  // 1. Execute Atomic Payout RPC
  // This handles Payout Insert, Cycle Increment, Wallet deduction (Group), 
  // Wallet credit (User), and Ledger entries in ONE transaction.
  const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('process_group_payout', {
    p_group_id: groupId,
    p_user_id: userId,
    p_amount: Number(amount),
    p_cycle_number: Number(cycleNumber || 1)
  })

  if (rpcError) {
    console.error('Payout RPC Error:', rpcError)
    return { error: `Database error during payout: ${rpcError.message}` }
  }

  if (rpcResult && !rpcResult.success) {
    console.error('Payout logic error:', rpcResult.error)
    return { error: `Payout failed: ${rpcResult.error}` }
  }
  
  revalidatePath(`/dashboard/group-savings/${groupId}`)
  return { success: true }
}

export async function recordPendingContribution({ amount, reference, planId = null, groupId = null, metadata = {} }) {
  const supabase = await createClient()
  
  // Optional auth
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null

  if (groupId) {
    const { error } = await supabase.from('group_contributions').insert({
      group_id: groupId,
      user_id: userId,
      amount: Number(amount),
      status: 'pending',
      provider: metadata.provider || 'paystack',
      reference: reference,
      contributor_name: metadata.contributor_name || metadata.contributorName || (user?.email ? user.email : 'Anonymous'),
      contributor_email: metadata.contributor_email || (user?.email ? user.email : null),
      cycle_number: metadata.cycle_number || null
    })
    if (error) {
      console.error('❌ [Pending] Group Contribution log failed:', error)
      return { error: 'Failed to initiate contribution record.' }
    }
  } else if (planId && userId) {
    const { error } = await supabase.from('contributions').insert({
      plan_id: planId,
      user_id: userId,
      amount: Number(amount),
      status: 'pending',
      provider: metadata.provider || 'paystack',
      reference: reference
    })
    if (error) {
      console.error('❌ [Pending] Standard Contribution log failed:', error)
      return { error: 'Failed to initiate plan contribution record.' }
    }
  }

  return { success: true }
}

export async function updateGroupStatus(groupId, newStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify Admin or Creator
  const { data: group } = await supabase
    .from('savings_groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (!group) return { error: 'Group not found.' }

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  const isAuthorized = group.created_by === user.id || member?.role === 'admin'
  if (!isAuthorized) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('savings_groups')
    .update({ status: newStatus })
    .eq('id', groupId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/group-savings/${groupId}`)
  revalidatePath(`/dashboard/group-savings/${groupId}/settings`)
  return { success: true }
}

export async function updateMemberPayoutOrder(groupId, orderMapping) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const adminSupabase = await createServiceRoleClient()

  // Verify admin permissions
  const { data: group } = await adminSupabase.from('savings_groups').select('created_by').eq('id', groupId).single()
  const { data: member } = await adminSupabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle()
  
  if (group?.created_by !== user.id && member?.role !== 'admin') {
    return { error: 'Only admins can change payout order.' }
  }

  // Perform updates for each member
  const updates = Object.entries(orderMapping).map(([userId, order]) => {
    return adminSupabase
      .from('group_members')
      .update({ payout_order: order })
      .eq('group_id', groupId)
      .eq('user_id', userId)
  })

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error).map(r => r.error.message)

  if (errors.length > 0) {
    console.error('Batch update order errors:', errors)
    return { error: 'Failed to update some positions.' }
  }

  revalidatePath(`/dashboard/group-savings/${groupId}`)
  revalidatePath(`/dashboard/group-savings/${groupId}/settings`)
  return { success: true }
}

export async function restartGroupRotation(groupId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const adminSupabase = await createServiceRoleClient()

  // Verify admin permissions
  const { data: group } = await adminSupabase.from('savings_groups').select('created_by, rotation_index, status').eq('id', groupId).single()
  const { data: member } = await adminSupabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle()
  
  if (group?.created_by !== user.id && member?.role !== 'admin') {
    return { error: 'Only admins can restart the group.' }
  }

  // Perform Restart
  let freqDays = 7
  if (group.frequency === 'daily') freqDays = 1
  if (group.frequency === 'weekly') freqDays = 7
  if (group.frequency === 'bi-weekly') freqDays = 14
  if (group.frequency === 'monthly') freqDays = 30

  const nextStartDate = new Date()
  nextStartDate.setDate(nextStartDate.getDate() + freqDays)

  const { error } = await adminSupabase
    .from('savings_groups')
    .update({ 
      status: 'active',
      current_cycle: 1,
      rotation_index: (group.rotation_index || 1) + 1,
      start_date: nextStartDate.toISOString() 
    })
    .eq('id', groupId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/group-savings/${groupId}`)
  revalidatePath(`/dashboard/group-savings/${groupId}/settings`)
  return { success: true }
}
