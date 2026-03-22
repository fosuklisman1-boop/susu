import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight, ArrowLeft, Target } from 'lucide-react'
import PaystackButton from '@/components/PaystackButton'

export default async function PesewasBoxPlanPage({ params }) {
  const { planId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: plan, error } = await supabase
    .from('susu_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', user.id)
    .single()

  if (error || !plan) redirect('/dashboard')

  const { data: contributions } = await supabase
    .from('contributions')
    .select('amount, created_at')
    .eq('plan_id', planId)
    .eq('status', 'success')
    .order('created_at', { ascending: false })

  const totalSaved = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0
  const progressPercentage = Math.min((totalSaved / Number(plan.target_amount)) * 100, 100)
  const periodicAmount = Number(plan.daily_contribution)
  const remaining = Math.max(0, Number(plan.target_amount) - totalSaved)

  const endDate = plan.end_date ? new Date(plan.end_date) : null
  const today = new Date(); today.setHours(0,0,0,0)
  const startDate = new Date(plan.start_date); startDate.setHours(0,0,0,0)
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))) : plan.duration_days

  const freqLabels = {
    daily: 'Daily Payment',
    weekly: 'Weekly Payment',
    monthly: 'Monthly Payment',
    flex: 'Pay Any Amount',
  }
  const freqLabel = freqLabels[plan.frequency] || 'Payment'

  // ── Build expected payment schedule ──────────────────────────────────
  // Calculate slots that should have been paid based on frequency
  const slots = []
  
  if (plan.frequency !== 'flex') {
    let cursor = new Date(startDate)
    const stepDays = plan.frequency === 'daily' ? 1 :
                     plan.frequency === 'weekly' ? 7 : 30
    const planEnd = endDate || new Date(startDate.getTime() + plan.duration_days * 86400000)

    let slotIndex = 1
    while (cursor <= planEnd) {
      const dueDate = new Date(cursor)
      const slotDateStr = dueDate.toISOString().split('T')[0]
      const isPast = dueDate < today
      slots.push({
        index: slotIndex++,
        dueDate: slotDateStr,
        amount: periodicAmount,
        status: isPast ? 'Overdue' : 'Pending'
      })
      cursor.setDate(cursor.getDate() + stepDays)
    }
  }

  // Count due (past) slots total expected vs what's been paid
  const dueSlots = slots.filter(s => s.status === 'Overdue')
  const totalExpected = dueSlots.length * periodicAmount
  const overdueAmount = Math.max(0, totalExpected - totalSaved)

  // Show ALL overdue slots + next 5 upcoming pending slots
  const overdueSlots = slots.filter(s => s.status === 'Overdue')
  const pendingSlots = slots.filter(s => s.status === 'Pending').slice(0, 5)
  const visibleSlots = [...overdueSlots, ...pendingSlots]

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard" style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', flex: 1 }}>{plan.name || 'Savings Plan'}</h2>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Top Banner */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GHS {totalSaved.toFixed(2)}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Saved</p>
            </div>
            <div style={{ background: '#b71c1c', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {daysLeft} DAY'S LEFT
            </div>
          </div>

          {/* Amount Due Block */}
          <div style={{ background: '#170b24', borderRadius: '16px', padding: '20px', textAlign: 'center', color: 'white' }}>
            {plan.frequency === 'flex' ? (
              <>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '4px' }}>FLEXIBLE</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Pay any amount at any time</p>
              </>
            ) : (
              <>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>{freqLabel}</p>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>GHS {periodicAmount.toFixed(2)}</h2>
              </>
            )}
          </div>
        </div>

        {/* Stats / Progress Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#22c55e', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={20} />
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Amount Saved</p>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>GHS {totalSaved.toFixed(2)}</h3>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Expected Goal</p>
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>GHS {Number(plan.target_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
          <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercentage}%`, background: '#22c55e', height: '100%', borderRadius: '3px' }}></div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '6px' }}>{progressPercentage.toFixed(1)}% complete</p>
        </div>

        {/* ── Due & Pending Payments ─────────────────────────────────── */}
        {plan.frequency !== 'flex' && (
          <>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>Due & Pending Payments</h3>

            {/* Overdue Card */}
            {overdueAmount > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ color: '#b91c1c', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Overdue Balance</p>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#7f1d1d' }}>GHS {overdueAmount.toFixed(2)}</h3>
                </div>
                <PaystackButton 
                  amount={overdueAmount}
                  email={user.email}
                  metadata={{ planId: plan.id }}
                  style={{ background: '#b91c1c', color: 'white', padding: '10px 16px', borderRadius: '10px', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  PAY ALL <ArrowUpRight size={16} />
                </PaystackButton>
              </div>
            )}

            {/* Payment Slot List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {visibleSlots.map((slot) => (
                <div key={slot.index} style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>
                      #{slot.index}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ background: slot.status === 'Overdue' ? '#ef4444' : '#f59e0b', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                          {slot.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expect to pay</span>
                      </div>
                      <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                        GHS {slot.amount.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '400' }}>on {slot.dueDate}</span>
                      </p>
                    </div>
                  </div>

                  <PaystackButton 
                    amount={slot.amount}
                    email={user.email}
                    metadata={{ planId: plan.id }}
                    style={{ background: '#ef4444', color: 'white', width: '36px', height: '36px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ArrowUpRight size={18} />
                  </PaystackButton>
                  {/* Note: buttonText="" since I'll add the icon manually inside or just use the button with the icon if I modify PaystackButton. 
                      Wait, my PaystackButton doesn't support children. I'll add a 'children' prop to PaystackButton. */}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Flex Plan – Pay Remaining */}
        {plan.frequency === 'flex' && (
          <>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>Make a Payment</h3>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>Remaining</p>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b71c1c', marginBottom: '16px' }}>GHS {remaining.toFixed(2)}</h2>
              <PaystackButton 
                amount={remaining}
                email={user.email}
                metadata={{ planId: plan.id }}
                style={{ width: '100%', background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                PAY NOW <ArrowUpRight size={18} />
              </PaystackButton>
            </div>
          </>
        )}

        {/* Payment History */}
        {contributions?.length > 0 && (
          <>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>Payment History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contributions.map((c, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</p>
                  <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '0.85rem', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>
                    + GHS {Number(c.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {(!contributions || contributions.length === 0) && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No payments yet. Tap a slot above to make your first contribution!
          </div>
        )}

      </div>
    </div>
  )
}
