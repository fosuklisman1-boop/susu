import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GroupSavingsClient from './GroupSavingsClient'

export default async function GroupSavingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch groups via membership
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  const memberGroupIds = memberships?.map(m => m.group_id) || []

  // Also fetch groups the user created directly (in case admin member row is missing)
  const { data: createdGroups } = await supabase
    .from('savings_groups')
    .select('id')
    .eq('created_by', user.id)

  const createdGroupIds = createdGroups?.map(g => g.id) || []

  // Combine and deduplicate
  const groupIds = [...new Set([...memberGroupIds, ...createdGroupIds])]

  let groups = []
  if (groupIds.length > 0) {
    const { data } = await supabase
      .from('savings_groups')
      .select('id, name, group_type, invite_code, target_amount, contribution_amount, created_by')
      .in('id', groupIds)
      .order('created_at', { ascending: false })

    if (data?.length) {
      const { data: memberCounts } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', data.map(g => g.id))

      const countMap = {}
      memberCounts?.forEach(m => {
        countMap[m.group_id] = (countMap[m.group_id] || 0) + 1
      })

      groups = data.map(g => ({ ...g, member_count: countMap[g.id] || 1 }))
    }
  }

  return <GroupSavingsClient groups={groups} />
}
