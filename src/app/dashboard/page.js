import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Lock, Users, Target, CheckCircle, ChevronRight, PlusCircle } from 'lucide-react'
import PaystackButton from '@/components/PaystackButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Fetch ALL user's active standard plans (exclude pesewa_challenge type)
  const { data: activePlans } = await supabase
    .from('susu_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .neq('plan_type', 'pesewa_challenge')
    .order('created_at', { ascending: false })

  // Fetch contributions for all plans
  let planSavings = {}
  if (activePlans?.length) {
    const { data: contributions } = await supabase
      .from('contributions')
      .select('plan_id, amount')
      .in('plan_id', activePlans.map(p => p.id))
      .eq('status', 'success')
    contributions?.forEach(c => {
      planSavings[c.plan_id] = (planSavings[c.plan_id] || 0) + Number(c.amount)
    })
  }

  // 3. Fetch user's individual contributions to any groups
  const { data: grpContribs } = await supabase
    .from('group_contributions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('status', 'success')
  
  const totalInPlans = Object.values(planSavings).reduce((sum, v) => sum + v, 0)
  const totalInGroups = (grpContribs || []).reduce((sum, c) => sum + Number(c.amount), 0)
  const totalIn = totalInPlans + totalInGroups

  // 4. Fetch Withdrawals (pending, approved, completed)
  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('user_id', user.id)
    .is('group_id', null) // Only personal withdrawals subtract from personal balance
    .in('status', ['pending', 'approved', 'completed'])

  const totalOut = (withdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0)
  const availableBalance = Math.max(totalIn - totalOut, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Main Red Balance Card */}
      <div className="main-balance-card">
        <div className="balance-card-header">
          <div className="balance-avatar">
            <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>{user.email?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{user.email?.split('@')[0]}</h3>
            <p style={{ fontSize: '0.75rem', opacity: 0.85 }}>Ghana &bull; ID: {user.id.slice(0,6)}</p>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>
            <Target size={18} />
          </div>
        </div>

        <div className="balance-amounts">
          <div>
            <p style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '4px' }}>Total Savings</p>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: '600', marginRight: '4px' }}>GHS</span>
              {availableBalance.toFixed(2)}
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>Locked</p>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '700', opacity: 0.9 }}>GHS 0.00</h1>
          </div>
        </div>

        <div className="balance-actions" style={{ marginTop: '14px', display: 'flex', gap: '12px' }}>
          <Link href="/dashboard/withdraw" style={{ flex: 1, textDecoration: 'none' }}>
            <button className="btn-withdraw" style={{ width: '100%', justifyContent: 'center', background: 'white', color: 'var(--primary)', padding: '12px', borderRadius: '10px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
               Withdraw
            </button>
          </Link>
          <PaystackButton 
            amount={10} // Default or ask user? I'll use a link to a top-up page if it gets complex, but for now fixed amount as demo
            email={user.email}
            buttonText="Top Up"
            style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '12px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', fontWeight: '700' }}
          />
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Link href="/dashboard/group-savings">
          <div className="sub-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '16px', margin: 0, height: '100%', cursor: 'pointer' }}>
            <div className="card-icon-box" style={{ background: '#fef2f2', color: '#d32f2f' }}>
              <Users size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Group Savings</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Save together with friends</p>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/pesewa-challenge">
          <div className="sub-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '16px', margin: 0, height: '100%', cursor: 'pointer' }}>
            <div className="card-icon-box" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Target size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Challenges</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reach your goals faster</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Active Plans Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827' }}>My Savings Plans</h3>
          <Link href="/dashboard/create-plan" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <PlusCircle size={16} /> New Plan
          </Link>
        </div>

        {activePlans?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activePlans.map(plan => {
              const saved = planSavings[plan.id] || 0
              const progress = Math.min((saved / Number(plan.target_amount)) * 100, 100)
              return (
                <Link key={plan.id} href={`/dashboard/pesewa-box/${plan.id}`}>
                  <div className="sub-card" style={{ padding: '16px', cursor: 'pointer', margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <div className="card-icon-box" style={{ background: '#f0fdf4', color: '#16a34a', width: '44px', height: '44px' }}>
                        <CheckCircle size={22} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>{plan.name || 'Savings Plan'}</h4>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>{progress.toFixed(0)}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', marginBottom: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, background: 'var(--primary)', height: '100%', borderRadius: '3px' }}></div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          GHS {saved.toFixed(2)} saved <span style={{ opacity: 0.5 }}>&bull;</span> Target GHS {Number(plan.target_amount).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <Link href="/dashboard/create-plan">
            <div style={{ border: '2px dashed #e5e7eb', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ background: '#fef2f2', color: 'var(--primary)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <PlusCircle size={24} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '4px' }}>No Active Plans</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Launch your first savings plan now!</p>
            </div>
          </Link>
        )}
      </div>

      {/* Account Info Bar */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
        <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '8px' }}>
          <Lock size={18} color="var(--text-muted)" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>Security Center</p>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Your savings are backed by Ghana Banks</p>
        </div>
        <ChevronRight size={18} color="#9ca3af" />
      </div>

    </div>
  )
}
