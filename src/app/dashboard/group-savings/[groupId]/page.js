import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, UserMinus, XCircle, Landmark } from 'lucide-react'
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
    .select('user_id, role, created_at')
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

  // Fetch contributions
  const { data: contributions, error: gcError } = await supabase
    .from('group_contributions')
    .select('id, amount, status, contributor_name, contributor_email, inserted_at, user_id, group_id')
    .eq('group_id', groupId)
    .eq('status', 'success')
    .order('inserted_at', { ascending: false })

  console.log(`[DEBUG] GroupID=${groupId} | UserID=${user.id} | GC_Count=${contributions?.length} | Error=${gcError?.message || 'none'}`)
  
  const totalContributed = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0
  
  // Fetch group withdrawals (for history view)
  const { data: grpWd } = await supabase
    .from('withdrawals')
    .select('amount, status, created_at, payout_method')
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
  
  // 1. Leaderboard for Challenge groups
  const memberTotals = {}
  if (group.group_type === 'challenge') {
    contributions?.forEach(c => {
      if (c.user_id) {
        memberTotals[c.user_id] = (memberTotals[c.user_id] || 0) + Number(c.amount)
      }
    })
  }

  // 2. Payout Schedule for Rotating groups
  const { data: payouts } = await supabase
    .from('payouts')
    .select('*')
    .eq('group_id', groupId)

  const currentCycle = group.current_cycle || 1
  const sortedMembers = members?.sort((a, b) => (a.payout_order || 99) - (b.payout_order || 99))
  
  // Find who to pay in current cycle
  const currentRecipient = sortedMembers?.[currentCycle - 1]
  const isRecipientPaid = payouts?.some(p => p.cycle_number === currentCycle)

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
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', flex: 1 }}>{group.name}</h2>
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
                const memberTotal = memberTotals[m.user_id] || 0
                const memberGoal = Number(group.target_amount || 0)
                const memberPct = memberGoal > 0 ? Math.min((memberTotal / memberGoal) * 100, 100) : 0
                const isMe = m.user_id === user.id
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: isMe ? '700' : '500' }}>{isMe ? 'You' : `Member ${i + 1}`}</span>
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

        {/* ── WITHDRAWAL HISTORY (Admins or Shared Pot Members) ────────────────── */}
        {(isAdmin || group.group_type === 'contribution') && grpWd?.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: '#b91c1c' }}>Withdrawal History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {grpWd.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < grpWd.length - 1 ? '1px solid #f3f4f6' : 'none', paddingBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>Withdrawal ({w.payout_method})</p>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {contributions?.slice(0, 10).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < 9 ? '1px solid #f3f4f6' : 'none', paddingBottom: '8px' }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{c.contributor_name || 'Anonymous'}</p>
                      {isAdmin && (
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.contributor_email || 'No email provided'}</p>
                      )}
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.inserted_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#16a34a' }}>+GHS {Number(c.amount).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ROTATING PAYOUT SCHEDULE ──────────────────────────────── */}
        {group.group_type === 'rotating' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>🔄 Payout Cycle</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedMembers?.map((m, i) => {
                const isMe = m.user_id === user.id
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
                      <p style={{ fontSize: '0.85rem', fontWeight: isMe ? '700' : '600' }}>
                        {isMe ? 'You' : (m.user_id ? `Member ${i + 1}` : 'Unknown Member')}
                        {isPaid && <span style={{ marginLeft: '8px', fontSize: '0.65rem', color: '#16a34a', fontWeight: '800' }}>PAID</span>}
                      </p>
                    </div>
                    {isCurrent && !isPaid && (
                      <PayoutAction 
                        groupId={groupId}
                        recipientId={m.user_id}
                        amount={Number(group.contribution_amount) * (members?.length || 1)}
                        currentCycle={currentCycle}
                        isAdmin={isAdmin}
                      />
                    )}
                    {!isCurrent && (
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isPaid ? '#16a34a' : '#6b7280' }}>
                        {isPaid ? 'COMPLETED' : `Cycle ${cycleNum}`}
                      </span>
                    )}
                  </div>
                )
              })}
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

            {/* Admin: Members List with Remove */}
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
                      <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{m.user_id === user.id ? 'You' : `Member ${i + 1}`}</p>
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

            {/* Admin: Danger Zone */}
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: '#b91c1c', fontSize: '0.9rem', fontWeight: '700', marginBottom: '8px' }}>⚠️ Admin Controls</h4>
              
              <GroupWithdrawalForm 
                availableBalance={availablePot}
                groupId={groupId}
                groupName={group.name}
                userEmail={user.email}
              />

              <button style={{ background: '#b91c1c', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={16} /> Close / End This Group
              </button>
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

            {/* Member List (shared for members too) */}
            <h1 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px' }}>👥 Members</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {members?.map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: m.role === 'admin' ? '#b71c1c' : '#1f2937', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                      {m.role === 'admin' ? 'A' : 'M'}
                    </div>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{m.user_id === user.id ? 'You' : `Member ${i + 1}`}</p>
                  </div>
                  <span style={{ background: m.role === 'admin' ? '#fef2f2' : '#f0fdf4', color: m.role === 'admin' ? '#b91c1c' : '#16a34a', fontSize: '0.75rem', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── CONTRIBUTE SECTION ───────────────────────── */}
        <GroupContributionForm 
          key={`${group.id}-${group.contribution_amount}-${group.is_fixed_contribution}-${group.min_contribution_amount}`}
          groupId={group.id}
          userEmail={user.email}
          userId={user.id}
          isFixed={group.is_fixed_contribution ?? true}
          fixedAmount={group.contribution_amount}
          minAmount={group.min_contribution_amount}
        />

      </div>
    </div>
  )
}
