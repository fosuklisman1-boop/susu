import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import ChallengeSetup from './ChallengeSetup'

export default async function PesewaChallengePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch the active challenge plan
  const { data: activeChallenge } = await supabase
    .from('susu_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('plan_type', 'pesewa_challenge')
    .eq('status', 'active')
    .single()

  // Calculate generic progress based on existing contributions for this plan (if any)
  let totalSaved = 0
  let progressPercentage = 0
  
  if (activeChallenge) {
    const { data: contributions } = await supabase
      .from('contributions')
      .select('amount')
      .eq('plan_id', activeChallenge.id)
      .eq('status', 'success')
      
    totalSaved = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0
    progressPercentage = Math.min((totalSaved / Number(activeChallenge.target_amount)) * 100, 100)
  }

  let currentDayIndex = 1
  let todaysAmount = 0
  let activeTransactions = []
  
  if (activeChallenge) {
    const start = new Date(activeChallenge.start_date)
    start.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)

    // Using daily_contribution as the stored Base Amount
    const baseAmount = Number(activeChallenge.daily_contribution)
    
    // Day index (Day 1, Day 2 etc.)
    currentDayIndex = Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1)
    
    // Cap it at duration
    if (currentDayIndex > activeChallenge.duration_days) {
      currentDayIndex = activeChallenge.duration_days
    }
    
    todaysAmount = currentDayIndex * baseAmount

    // Calculate Overdue dynamically
    // Overdue is the expected sum up to YESTERDAY minus total saved.
    const expectedSumUpToYesterday = baseAmount * ((currentDayIndex - 1) * currentDayIndex) / 2
    const rawOverdue = expectedSumUpToYesterday - totalSaved
    const overdueAmount = rawOverdue > 0 ? rawOverdue : 0

    // Mock transactions for current day and next 4 days dynamically
    activeTransactions = Array.from({ length: 5 }).map((_, i) => {
      const dayOffset = currentDayIndex + i
      const dayAmount = dayOffset * baseAmount
      const dateStr = new Date(start.getTime() + (dayOffset - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      return {
        id: dayOffset,
        rawAmount: dayAmount,
        amount: dayAmount.toFixed(2),
        date: dateStr,
        status: i === 0 ? 'Due Today' : 'Pending'
      }
    }).filter(tx => tx.id <= activeChallenge.duration_days)
  }

  // Fallbacks for scope when activeChallenge is null
  const overdueAmount = activeChallenge ? Math.max(0, (Number(activeChallenge.daily_contribution) * ((Math.max(1, Math.floor((new Date().setHours(0,0,0,0) - new Date(activeChallenge.start_date).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) + 1) - 1) * Math.max(1, Math.floor((new Date().setHours(0,0,0,0) - new Date(activeChallenge.start_date).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) + 1)) / 2) - totalSaved) : 0

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', padding: '16px', paddingBottom: '100px' }}>
      
      {!activeChallenge ? (
        <ChallengeSetup />
      ) : (
        /* -------------------------------------------------------------------------- */
        /*                            ACTIVE CHALLENGE STATE                          */
        /* -------------------------------------------------------------------------- */
        <>
          {/* Top Banner Card */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GHS {totalSaved.toFixed(2)}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Saved</p>
              </div>
              <div style={{ background: '#b71c1c', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {Math.max(activeChallenge.duration_days - (currentDayIndex - 1), 0)} DAY'S LEFT
              </div>
            </div>

            {/* Pending Block */}
            <div style={{ background: '#170b24', borderRadius: '16px', padding: '20px', textAlign: 'center', color: 'white' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '4px' }}>PENDING</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Todays Amount: GHS {todaysAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Stats Card */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#b71c1c', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  Stp
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Amount Saved</p>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>GHS {totalSaved.toFixed(2)}</h3>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Expected Goal</p>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>GHS {Number(activeChallenge.target_amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</h3>
              </div>

            </div>
            
            {/* Progress Bar */}
            <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', width: '100%', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercentage}%`, background: '#ef4444', height: '100%' }}></div>
            </div>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>Due & Pending Transactions</h3>

          {/* Pay All Overdue Card */}
          {overdueAmount > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
              <div>
                <p style={{ color: '#b91c1c', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Overdue Balance</p>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#7f1d1d' }}>GHS {overdueAmount.toFixed(2)}</h3>
              </div>
              <form action="/api/paystack/initialize" method="POST">
                <input type="hidden" name="planId" value={activeChallenge.id} />
                <input type="hidden" name="amount" value={overdueAmount} />
                <input type="hidden" name="email" value={user.email} />
                <button type="submit" style={{ background: '#b91c1c', color: 'white', padding: '10px 16px', borderRadius: '10px', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  PAY ALL <ArrowUpRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Transaction List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeTransactions.map((tx) => (
                  <div 
                  key={tx.id} 
                  style={{ 
                    background: tx.status === 'Due Today' ? '#fffbeb' : 'white', 
                    borderRadius: '16px', 
                    padding: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    border: tx.status === 'Due Today' ? '1px solid #f59e0b' : '1px solid transparent'
                  }}
                >
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #4c0519 0%, #170b24 100%)', position: 'relative' }}>
                      <div style={{ position: 'absolute', bottom: '6px', left: '6px', width: '12px', height: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '4px' }}></div>
                    </div>
                    
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          background: tx.status === 'Overdue' ? '#ef4444' : (tx.status === 'Due Today' ? '#f59e0b' : '#9ca3af'), 
                          color: 'white', 
                          fontSize: '0.65rem', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontWeight: '600' 
                        }}>
                          {tx.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expect to pay</span>
                      </div>
                      <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                        GHS {Number(tx.amount).toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '400' }}>on {tx.date}</span>
                      </p>
                    </div>
                  </div>

                  <form action="/api/paystack/initialize" method="POST">
                    <input type="hidden" name="planId" value={activeChallenge.id} />
                    <input type="hidden" name="amount" value={tx.rawAmount} />
                    <input type="hidden" name="email" value={user.email} />
                    <button type="submit" style={{ background: '#ef4444', color: 'white', width: '36px', height: '36px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ArrowUpRight size={18} />
                    </button>
                  </form>

              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}
