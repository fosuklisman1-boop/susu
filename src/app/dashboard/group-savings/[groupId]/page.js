import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, UserMinus, XCircle, Landmark, Users, Trophy, CheckCircle2 } from 'lucide-react'
import PaystackButton from '@/components/PaystackButton'
import GroupContributionForm from './GroupContributionForm'
import GroupWithdrawalForm from './GroupWithdrawalForm'
import PayoutAction from './PayoutAction'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GroupDetailPage({ params }) {
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

  // Fetch members with their roles
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, role, created_at, payout_order, profiles(full_name, email)')
    .eq('group_id', groupId)

  // Determine current user's role
  const myMembership = members?.find(m => m.user_id === user.id)
  // Creator is always admin — even if their member row is missing
  const isAdmin = myMembership?.role === 'admin' || group.created_by === user.id

  // Auto-repair: insert admin row if creator visits but has no member row
  if (group.created_by === user.id && !myMembership) {
    await supabase.from('group_members').upsert({
      group_id: groupId,
      user_id: user.id,
      role: 'admin'
    }, { onConflict: 'group_id,user_id' })
  }

  // Fetch successful contributions for history and totals
  const { data: contributions, error: gcError } = await supabase
    .from('group_contributions')
    .select('id, amount, status, contributor_name, contributor_email, created_at, user_id, group_id, cycle_number, profiles(full_name)')
    .eq('group_id', groupId)
    .eq('status', 'success')
    .order('created_at', { ascending: false })

  console.log(`[DEBUG] GroupID=${groupId} | UserID=${user.id} | GC_Count=${contributions?.length} | Error=${gcError?.message || 'none'}`)
  
  const totalContributed = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0
  
  // Fetch group withdrawals (for history view)
  const { data: grpWd } = await supabase
    .from('withdrawals')
    .select('amount, status, created_at, payout_method, user_id, profiles(full_name)')
    .eq('group_id', groupId)
    .in('status', ['pending', 'approved', 'completed', 'rejected'])
    .order('created_at', { ascending: false })
  
  // Fetch actual Wallet balance - use maybeSingle to avoid PGRST116 error if missing
  let { data: walletData, error: walletError } = await supabase
    .from('wallets')
    .select('balance')
    .eq('group_id', groupId)
    .maybeSingle()
    
  // AUTO-REPAIR: If no wallet exists for this group, create one
  if (!walletData && !walletError) {
    console.log(`[DEBUG] No wallet found for group ${groupId}. Initializing...`)
    const { data: newWallet } = await supabase.from('wallets').insert({
      group_id: groupId,
      balance: 0
    }).select('balance').single()
    walletData = newWallet
  }

  const availablePot = walletData?.balance || 0

  const targetAmount = Number(group.target_amount || 0)
  const progressPct = targetAmount > 0 ? Math.min((totalContributed / targetAmount) * 100, 100) : 0

  // ── TYPE-SPECIFIC LOGIC ─────────────────────────────────────────
  
  // Aggregate stats per contributor (Handles registered and anonymous)
  const contributorStats = {}
  contributions?.forEach(c => {
    // Generate a stable key for each contributor
    const key = c.user_id || c.contributor_email || c.contributor_name || 'Anonymous'
    if (!contributorStats[key]) {
      contributorStats[key] = {
        name: c.contributor_name || 'Anonymous',
        email: c.contributor_email || '',
        userId: c.user_id,
        total: 0,
        count: 0
      }
    }
    contributorStats[key].total += Number(c.amount)
    contributorStats[key].count += 1
  })

  // Sort by highest contribution first
  const sortedContributors = Object.values(contributorStats).sort((a, b) => b.total - a.total)

  // 2. Payout Schedule for Rotating groups
  const { data: payouts } = await supabase
    .from('payouts')
    .select('*')
    .eq('group_id', groupId)

  const currentCycle = group.current_cycle || 1
  const sortedMembers = members?.sort((a, b) => {
    const orderA = a.payout_order || 999
    const orderB = b.payout_order || 999
    if (orderA !== orderB) return orderA - orderB
    return new Date(a.created_at) - new Date(b.created_at)
  })

  // Find my position for the summary card
  const myPosition = myMembership?.payout_order || (sortedMembers?.findIndex(m => m.user_id === user.id) + 1)
  
  // Find who to pay in current cycle
  const currentRecipient = sortedMembers?.[currentCycle - 1]
  const isRecipientPaid = payouts?.some(p => p.cycle_number === currentCycle)
  
  // Lifecycle Status
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
  const isLockedUntilFull = !!group.max_members && (members?.length || 0) < group.max_members

  // Phase 36: Check if everyone has paid for the current cycle (Rotating)
  const everyonePaidThisCycle = group.group_type === 'rotating' 
    ? sortedMembers?.every(m => contributions?.some(c => 
        c.cycle_number === currentCycle && 
        (c.user_id === m.user_id || (m.profiles?.email && c.contributor_email === m.profiles.email))
      ))
    : true

  // Phase 36: Calculate delay for overdue cycles
  const delayDays = (() => {
    if (!group.start_date || group.group_type !== 'rotating' || everyonePaidThisCycle) return 0
    
    let freqDays = 7
    if (!isNaN(Number(group.frequency))) freqDays = Number(group.frequency)
    else if (group.frequency === 'weekly') freqDays = 7
    else if (group.frequency === 'biweekly') freqDays = 14
    else if (group.frequency === 'monthly') freqDays = 30

    const dueDate = new Date(group.start_date)
    dueDate.setDate(dueDate.getDate() + (currentCycle - 1) * freqDays)
    
    const today = new Date()
    if (today > dueDate) {
      const diffTime = Math.abs(today - dueDate)
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
    return 0
  })()

  const typeLabels = {
    rotating: 'Rotating Group Savings',
    contribution: 'Contribution Group Savings',
    challenge: 'Public Group Challenge'
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard/group-savings" style={{ color: 'white' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{group.name}</h2>
        {(isClosed || (isExpired && group.group_type !== 'rotating')) && (
          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>
            {isClosed ? 'CLOSED' : 'EXPIRED'}
          </span>
        )}
        {isExpired && group.group_type === 'rotating' && !isClosed && (
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>
            OVERDUE
          </span>
        )}
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600' }}>
            {typeLabels[group.group_type] || group.group_type}
          </span>
          {/* Admin badge */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ background: '#fbbf24', color: '#1f2937', padding: '4px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '700' }}>
                ADMIN
              </span>
              <Link href={`/dashboard/group-savings/${groupId}/settings`} style={{ color: 'white' }}>
                <Settings size={20} />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── SAVER PAYOUT INFO (For Rotating Members) ────────────────────── */}
        {group.group_type === 'rotating' && myMembership && (
          <div style={{ 
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
            borderRadius: '20px', 
            padding: '24px', 
            color: 'white', 
            marginBottom: '16px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Accent */}
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
            
            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', letterSpacing: '1px', opacity: 0.7, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} color="#fbbf24" /> YOUR PAYOUT SUMMARY
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '4px' }}>Expected Payout</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fbbf24' }}>
                  GHS {(Number(group.max_members || (members?.length || 1)) * Number(group.contribution_amount)).toLocaleString()}
                </h2>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '4px' }}>Your Position</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Cycle {myPosition || 'N/A'}</h2>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '4px' }}>Estimated Date</p>
                <p style={{ fontSize: '1rem', fontWeight: '700' }}>
                  {(() => {
                    if (!group.start_date || !myPosition) return 'Not set yet'
                    const d = new Date(group.start_date)
                    const offset = (myPosition - 1)
                    
                    let freqDays = 7
                    if (!isNaN(Number(group.frequency))) {
                      freqDays = Number(group.frequency)
                    } else {
                      if (group.frequency === 'weekly') freqDays = 7
                      else if (group.frequency === 'biweekly') freqDays = 14
                      else if (group.frequency === 'monthly') freqDays = 30
                    }

                    d.setDate(d.getDate() + offset * freqDays)
                    
                    // Add delay if we are at or past this cycle and it's stalled
                    if (myPosition >= currentCycle) {
                      d.setDate(d.getDate() + delayDays)
                    }

                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  })()}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '4px' }}>Cycle Goal</p>
                <p style={{ fontSize: '1rem', fontWeight: '700' }}>
                  {(group.max_members || (members?.length || 0))} Member(s)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Banner */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Available Wallet Balance</p>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#16a34a' }}>GHS {Number(availablePot).toFixed(2)}</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Contributed</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>GHS {totalContributed.toFixed(2)}</h2>
            </div>
          </div>
          {targetAmount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Group Goal Progress</span>
                <span>{progressPct.toFixed(1)}% of GHS {targetAmount.toLocaleString()}</span>
              </div>
              <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, background: '#22c55e', height: '100%', borderRadius: '3px' }}></div>
              </div>
            </>
          )}
        </div>

        {/* Public Contribution Link — visible to ALL members (contribution groups) */}
        {group.group_type === 'contribution' && (
          <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '16px', padding: '20px', marginBottom: '16px', border: '1px solid #fcd34d' }}>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px', color: '#92400e' }}>🔗 Public Contribution Link</h4>
            <p style={{ fontSize: '0.8rem', color: '#78350f', marginBottom: '10px' }}>
              Share this — anyone can contribute without creating an account.
            </p>
            <div style={{ background: 'white', borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem', color: '#374151', wordBreak: 'break-all', marginBottom: '10px' }}>
              {`${siteUrl}/contribute/${group.invite_code}`}
            </div>
            <a href={`${siteUrl}/contribute/${group.invite_code}`} target="_blank"
              style={{ display: 'inline-block', background: '#d97706', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
              Preview Public Page →
            </a>
          </div>
        )}

        {/* ── CHALLENGE LEADERBOARD ─────────────────────────────── */}
        {group.group_type === 'challenge' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏆 Leaderboard
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {members?.map((m, i) => {
                const memberTotal = contributorStats[m.user_id]?.total || 0
                const memberGoal = Number(group.target_amount || 0)
                const memberPct = memberGoal > 0 ? Math.min((memberTotal / memberGoal) * 100, 100) : 0
                const isMe = m.user_id === user.id
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: isMe ? '700' : '500' }}>{isMe ? 'You' : (m.profiles?.full_name || `Member ${i + 1}`)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>GHS {memberTotal.toFixed(2)} / {memberGoal.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${memberPct}%`, background: isMe ? '#d32f2f' : '#374151', height: '100%', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TOP CONTRIBUTORS (For Shared Pot and Challenges) ────────────────── */}
        {(group.group_type === 'contribution' || group.group_type === 'challenge') && sortedContributors.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} />
              Contributors ({sortedContributors.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sortedContributors.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '8px', 
                      background: i === 0 ? '#fbbf24' : '#f3f4f6', 
                      color: i === 0 ? '#92400e' : '#6b7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: '800'
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                        {c.userId === user.id ? 'You' : c.name}
                      </p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.count} contribution{c.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', fontWeight: '800', color: '#111827' }}>GHS {c.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WITHDRAWAL HISTORY (Admins or Shared Pot Members) ────────────────── */}
        {(isAdmin || group.group_type === 'contribution') && grpWd?.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: '#b91c1c' }}>Withdrawal History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {grpWd.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < grpWd.length - 1 ? '1px solid #f3f4f6' : 'none', paddingBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                      {w.profiles?.full_name ? `${w.profiles.full_name}'s Withdrawal` : `Withdrawal (${w.payout_method})`}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(w.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>-GHS {Number(w.amount).toFixed(2)}</p>
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: w.status === 'completed' ? '#16a34a' : '#d97706' }}>
                      {w.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONTRIBUTION HISTORY (Show for all types) ────────────────────────── */}
        {true && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>Recent Contributions</h3>
            {contributions?.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0' }}>No contributions yet. Start the ball rolling!</p>
            ) : (
              <div 
                className="custom-scrollbar"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '12px' }}
              >
                {contributions?.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < (contributions.length - 1) ? '1px solid #f3f4f6' : 'none', paddingBottom: '8px' }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{c.profiles?.full_name || c.contributor_name || 'Anonymous'}</p>
                      {isAdmin && !c.profiles?.full_name && (
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.contributor_email || 'No email provided'}</p>
                      )}
                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#16a34a' }}>+GHS {Number(c.amount).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ROTATING CYCLE CONTRIBUTION TRACKER ────────────────────────── */}
        {group.group_type === 'rotating' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Cycle {currentCycle} Contribution Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedMembers?.map((m, i) => {
                const isPaid = contributions?.some(c => 
                  c.cycle_number === currentCycle && 
                  (c.user_id === m.user_id || (m.profiles?.email && c.contributor_email === m.profiles.email))
                )
                const isMe = m.user_id === user.id
                
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: isPaid ? '#f0fdf4' : '#f9fafb', borderRadius: '12px', border: `1px solid ${isPaid ? '#bcf0da' : '#f3f4f6'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', 
                        background: isPaid ? '#16a34a' : '#9ca3af', 
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' 
                      }}>
                        {m.profiles?.full_name?.charAt(0) || '?'}
                      </div>
                      <p style={{ fontSize: '0.85rem', fontWeight: isMe ? '700' : '600', color: isPaid ? '#065f46' : '#374151' }}>
                        {isMe ? 'You' : (m.profiles?.full_name || `Member ${i + 1}`)}
                      </p>
                    </div>
                    {isPaid ? (
                      <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#16a34a', background: '#dcfce7', padding: '4px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                        PAID
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                        PENDING
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {!isLockedUntilFull && !isRecipientPaid && (
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '16px', textAlign: 'center', fontStyle: 'italic' }}>
                All members must contribute GHS {Number(group.contribution_amount).toLocaleString()} to complete this cycle.
              </p>
            )}
          </div>
        )}

        {/* ── ROTATING PAYOUT SCHEDULE ──────────────────────────────── */}
        {group.group_type === 'rotating' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>🔄 Payout Cycle</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const totalSlots = Math.max(group.max_members || 0, sortedMembers?.length || 0)
                const allCycles = Array.from({ length: totalSlots }, (_, i) => {
                  const member = sortedMembers?.[i] || null
                  return { index: i, member }
                })

                return allCycles.map(({ index: i, member: m }) => {
                  const isMe = m?.user_id === user.id
                  const cycleNum = i + 1
                  const isPaid = payouts?.some(p => p.cycle_number === cycleNum && p.status === 'completed')
                  const isCurrent = cycleNum === currentCycle

                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: cycleNum < currentCycle ? 0.6 : 1 }}>
                      <div style={{ 
                        width: '28px', height: '28px', borderRadius: '50%', 
                        background: isPaid ? '#16a34a' : (isCurrent ? '#FDBE2C' : '#f3f4f6'), 
                        color: isPaid || isCurrent ? 'white' : '#374151', 
                        fontSize: '0.8rem', fontWeight: '700', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center' 
                      }}>
                        {isPaid ? <CheckCircle2 size={16} /> : cycleNum}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: isMe ? '700' : '600', marginBottom: '2px' }}>
                          {isMe ? 'You' : (m?.user_id ? (m.profiles?.full_name || `Member ${i + 1}`) : <span style={{ color: '#9ca3af', fontWeight: '400' }}>Waiting for member...</span>)}
                          {isPaid && <span style={{ marginLeft: '8px', fontSize: '0.65rem', color: '#16a34a', fontWeight: '800' }}>PAID</span>}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {(() => {
                            if (!group.start_date) return 'TBD'
                            const d = new Date(group.start_date)
                          const offset = i
                          
                          let freqDays = 7
                          if (!isNaN(Number(group.frequency))) {
                            freqDays = Number(group.frequency)
                          } else {
                            if (group.frequency === 'weekly') freqDays = 7
                            else if (group.frequency === 'biweekly') freqDays = 14
                            else if (group.frequency === 'monthly') freqDays = 30
                          }

                          d.setDate(d.getDate() + offset * freqDays)
                          
                          // Phase 36: Apply delay to current and future cycles
                          if (cycleNum >= currentCycle) {
                            d.setDate(d.getDate() + delayDays)
                          }

                            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                          })()}
                        </p>
                      </div>
                      {isCurrent && m?.user_id && !isPaid && (
                        isClosed ? (
                          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
                            Group Closed
                          </div>
                        ) : isLockedUntilFull ? (
                          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
                            Waiting for {group.max_members - (members?.length || 0)} more members...
                          </div>
                        ) : !everyonePaidThisCycle ? (
                          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span> In Progress
                          </div>
                        ) : (
                          <PayoutAction 
                            groupId={groupId}
                            recipientId={m.user_id}
                            amount={Number(group.contribution_amount) * (group.max_members || (members?.length || 1))}
                            currentCycle={currentCycle}
                            isAdmin={isAdmin}
                          />
                        )
                      )}
                      {(!isCurrent || !m?.user_id) && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isPaid ? '#16a34a' : '#6b7280' }}>
                          {isPaid ? 'COMPLETED' : `Cycle ${cycleNum}`}
                        </span>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}
        
        {/* ── ADMIN-ONLY SECTION ─────────────────────────────── */}
        {isAdmin && (
          <>
            {/* Invite Code Card */}
            <div style={{ background: '#170b24', borderRadius: '16px', padding: '20px', marginBottom: '16px', textAlign: 'center', color: 'white' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '4px' }}>INVITE CODE — Share to add members</p>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '8px', marginBottom: '4px' }}>{group.invite_code}</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Members join from the Group Savings page</p>
            </div>

            {/* Admin: Members List with Remove (Hidden for Contribution groups in favor of Contributors list) */}
            {group.group_type !== 'contribution' && (
              <>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px' }}>
                  👥 Manage Members ({members?.length || 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {members?.map((m, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: m.role === 'admin' ? '#b71c1c' : '#1f2937', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                          {m.role === 'admin' ? 'A' : 'M'}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{m.user_id === user.id ? 'You' : (m.profiles?.full_name || `Member ${i + 1}`)}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Joined {m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: m.role === 'admin' ? '#fef2f2' : '#f0fdf4', color: m.role === 'admin' ? '#b91c1c' : '#16a34a', fontSize: '0.75rem', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>
                          {m.role}
                        </span>
                        {m.user_id !== user.id && (
                          <button title="Remove member"
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Admin: Danger Zone */}
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: '#b91c1c', fontSize: '0.9rem', fontWeight: '700', marginBottom: '8px' }}>⚠️ Admin Funds Management</h4>
              
              <GroupWithdrawalForm 
                availableBalance={availablePot}
                groupId={groupId}
                groupName={group.name}
                userEmail={user.email}
              />
            </div>
          </>
        )}

        {/* ── MEMBER-ONLY SECTION ─────────────────────────────── */}
        {!isAdmin && (
          <>
            <div style={{ background: '#170b24', borderRadius: '16px', padding: '20px', marginBottom: '16px', textAlign: 'center', color: 'white' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '4px' }}>INVITE CODE</p>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '8px', marginBottom: '4px' }}>{group.invite_code}</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Share this with friends to invite them</p>
            </div>

            {/* Member List (Hidden for Contribution groups) */}
            {group.group_type !== 'contribution' && (
              <>
                <h1 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px' }}>👥 Members</h1>
              </>
            )}
            {group.group_type !== 'contribution' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {members?.map((m, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: m.role === 'admin' ? '#b71c1c' : '#1f2937', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                        {m.role === 'admin' ? 'A' : 'M'}
                      </div>
                      <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{m.user_id === user.id ? 'You' : (m.profiles?.full_name || `Member ${i + 1}`)}</p>
                    </div>
                    <span style={{ background: m.role === 'admin' ? '#fef2f2' : '#f0fdf4', color: m.role === 'admin' ? '#b91c1c' : '#16a34a', fontSize: '0.75rem', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CONTRIBUTE SECTION ───────────────────────── */}
        {!(isClosed || isExpired || isLockedUntilFull) ? (
          <GroupContributionForm 
            key={`${group.id}-${group.contribution_amount}-${group.is_fixed_contribution}-${group.min_contribution_amount}`}
            groupId={group.id}
            userEmail={user.email}
            userId={user.id}
            isFixed={group.is_fixed_contribution ?? true}
            fixedAmount={group.contribution_amount}
            minAmount={group.min_contribution_amount}
            cycleNumber={currentCycle}
          />
        ) : (
          <div style={{ 
            background: isLockedUntilFull ? '#fffbeb' : '#fef2f2', 
            border: isLockedUntilFull ? '1px solid #fde68a' : '1px solid #fee2e2', 
            borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px' 
          }}>
            {isLockedUntilFull ? (
              <>
                <Users size={40} color="#d97706" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#92400e', marginBottom: '4px' }}>
                  Awaiting Members
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#d97706' }}>
                  This group will start as soon as it reaches <strong>{group.max_members} members</strong> (Currently: {members?.length || 0})
                </p>
              </>
            ) : (
              <>
                <XCircle size={40} color="#b91c1c" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#b91c1c', marginBottom: '4px' }}>
                  Contributions are Disabled
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#b91c1c', opacity: 0.8 }}>
                  {isClosed ? 'This group has been marked as CLOSED by the administrator.' : 'The set duration for this goal has elapsed.'}
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
