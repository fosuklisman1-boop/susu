import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import ContributeClient from './ContributeClient'

export default async function PublicContributePage({ params }) {
  const { inviteCode } = await params
  const supabase = await createClient()

  // Fetch group by invite code — public, no auth required
  const { data: group, error } = await supabase
    .from('savings_groups')
    .select('id, name, group_type, target_amount, invite_code')
    .eq('invite_code', inviteCode.toUpperCase())
    .in('group_type', ['contribution', 'challenge']) // Support public links for both types
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

  // Recent contributors (last 5)
  const recentContributors = contributions
    ?.slice(-5)
    .reverse()
    .map(c => ({ name: c.contributor_name || 'Anonymous', amount: Number(c.amount) }))

  return (
    <ContributeClient
      group={group}
      totalRaised={totalRaised}
      targetAmount={targetAmount}
      progressPct={progressPct}
      recentContributors={recentContributors || []}
    />
  )
}
