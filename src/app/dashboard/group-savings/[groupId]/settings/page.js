import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings as SettingsIcon, Save, Info } from 'lucide-react'
import SettingsForm from './SettingsForm'
import PayoutOrderManager from './PayoutOrderManager'

export default async function GroupSettingsPage({ params }) {
  const { groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group, error } = await supabase
    .from('savings_groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (error || !group) redirect('/dashboard/group-savings')

  // Verify Admin
  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  const isAdmin = member?.role === 'admin' || group.created_by === user.id

  if (!isAdmin) {
    redirect(`/dashboard/group-savings/${groupId}?error=Admin+access+required`)
  }

  // Fetch all members for reordering (only for rotating)
  let members = []
  if (group.group_type === 'rotating') {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, payout_order, created_at, profiles(full_name)')
      .eq('group_id', groupId)
    members = data || []
  }

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '100px' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href={`/dashboard/group-savings/${groupId}`} style={{ color: 'white' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Group Settings</h2>
      </div>

      <div style={{ padding: '20px' }}>
        <SettingsForm group={group} />
        
        {group.group_type === 'rotating' && (
          <PayoutOrderManager 
            groupId={groupId} 
            initialMembers={members} 
            currentCycle={group.current_cycle || 1} 
          />
        )}
      </div>
    </div>
  )
}
