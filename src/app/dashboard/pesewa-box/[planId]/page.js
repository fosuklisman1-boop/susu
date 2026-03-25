import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PesewaBoxClient from './PesewaBoxClient'

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

  // Use persistent current_balance for accurate and fast tracking
  const totalSaved = Number(plan.current_balance || 0)
  const progressPercentage = Math.min((totalSaved / Number(plan.target_amount)) * 100, 100)
  const periodicAmount = Number(plan.daily_contribution)
  const remaining = Math.max(0, Number(plan.target_amount) - totalSaved)

  const endDate = plan.end_date ? new Date(plan.end_date) : null
  const today = new Date(); today.setHours(0,0,0,0)
  const startDate = new Date(plan.start_date); startDate.setHours(0,0,0,0)
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))) : plan.duration_days

  const freqLabels = { daily: 'Daily Payment', weekly: 'Weekly Payment', monthly: 'Monthly Payment', flex: 'Pay Any Amount' }
  const freqLabel = freqLabels[plan.frequency] || 'Payment'

  const slots = []
  let pastExpected = 0
  if (plan.frequency !== 'flex') {
    let cursor = new Date(startDate)
    const stepDays = plan.frequency === 'daily' ? 1 : plan.frequency === 'weekly' ? 7 : 30
    const planEnd = endDate || new Date(startDate.getTime() + plan.duration_days * 86400000)
    let slotIndex = 1
    const fullyPaidSlotsCount = Math.floor((totalSaved + 0.01) / periodicAmount)

    while (cursor <= planEnd) {
      const dueDate = new Date(cursor)
      const slotDateStr = dueDate.toISOString().split('T')[0]
      const isPast = dueDate < today
      const isToday = dueDate.getTime() === today.getTime()
      
      let status = 'Pending'
      if (slotIndex <= fullyPaidSlotsCount) {
        status = 'Paid'
      } else if (isPast) {
        status = 'Overdue'
      } else if (isToday) {
        status = 'Due Today'
      }

      if (isPast) pastExpected += periodicAmount

      slots.push({ index: slotIndex++, dueDate: slotDateStr, amount: periodicAmount, status })
      cursor.setDate(cursor.getDate() + stepDays)
    }
  }

  const todayStr = today.toISOString().split('T')[0]
  const overdueAmount = Math.max(0, pastExpected - totalSaved)
  const visibleSlots = [
    ...slots.filter(s => s.status === 'Overdue'), 
    ...slots.filter(s => s.status === 'Due Today'),
    ...slots.filter(s => s.status === 'Paid' && s.dueDate === todayStr),
    ...slots.filter(s => s.status === 'Pending').slice(0, 5)
  ]

  // Still fetch contributions for the history list
  const { data: historyContributions } = await supabase
    .from('contributions')
    .select('amount, created_at')
    .eq('plan_id', planId)
    .eq('status', 'success')
    .order('created_at', { ascending: false })

  return (
    <PesewaBoxClient 
      user={user}
      plan={plan}
      totalSaved={totalSaved}
      progressPercentage={progressPercentage}
      daysLeft={daysLeft}
      periodicAmount={periodicAmount}
      overdueAmount={overdueAmount}
      remaining={remaining}
      visibleSlots={visibleSlots}
      contributions={historyContributions}
      freqLabel={freqLabel}
    />
  )
}
