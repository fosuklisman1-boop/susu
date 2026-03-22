import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import ContributeClient from './ContributeClient'

export default async function PublicContributePage({ params }) {
  const { inviteCode } = await params
  const supabase = await createClient()

  // Fetch group by invite code — public, no auth required
  const { data: group, error } = await supabase
    .from('savings_groups')
    .select('id, name, group_type, target_amount, invite_code, is_fixed_contribution, contribution_amount, min_contribution_amount, status, start_date, end_date, frequency, max_members')
    .eq('invite_code', inviteCode.toUpperCase())
    .in('group_type', ['contribution', 'challenge'])
    .single()

  if (error || !group) return notFound()

  // Fetch total contributed so far by all contributors
  const { data: contributions } = await supabase
    .from('group_contributions')
    .select('amount, contributor_name')
    .eq('group_id', group.id)
    .eq('status', 'success')

  const totalRaised = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0
  const targetAmount = Number(group.target_amount || 0)
  const progressPct = targetAmount > 0 ? Math.min((totalRaised / targetAmount) * 100, 100) : 0

  // Fetch member count for "Locked until full" check
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id)

  // Calculate if group is expired or closed
  const isClosed = group.status === 'closed'
  const isExpired = (() => {
    // 1. Check explicit end date
    if (group.end_date && new Date() > new Date(group.end_date)) return true
    
    // 2. Check frequency-based duration (if start_date exists)
    if (group.start_date && group.frequency && !isNaN(Number(group.frequency))) {
      const start = new Date(group.start_date)
      const durationDays = Number(group.frequency)
      const end = new Date(start)
      end.setDate(end.getDate() + durationDays)
      return new Date() > end
    }
    
    return false
  })()

  // Recent contributors (last 5)
  const recentContributors = contributions
    ?.map(c => ({ name: c.contributor_name || 'Anonymous', amount: Number(c.amount) }))

  const isLockedUntilFull = !!group.max_members && (memberCount || 0) < group.max_members

  return (
    <ContributeClient
      group={group}
      totalRaised={totalRaised}
      targetAmount={targetAmount}
      progressPct={progressPct}
      recentContributors={recentContributors || []}
      isExpired={isExpired}
      isClosed={isClosed}
      isLockedUntilFull={isLockedUntilFull}
      memberCount={memberCount || 0}
    />
  )
}
