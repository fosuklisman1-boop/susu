import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChallengeSetup from './ChallengeSetup'
import PesewaChallengeClient from './PesewaChallengeClient'

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

  if (!activeChallenge) {
    return (
      <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', padding: '16px' }}>
        <ChallengeSetup />
      </div>
    )
  }

  // 1. Calculate Total Saved
  const { data: contributions } = await supabase
    .from('contributions')
    .select('amount')
    .eq('plan_id', activeChallenge.id)
    .eq('status', 'success')
      
  const totalSaved = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0
  const progressPercentage = Math.min((totalSaved / Number(activeChallenge.target_amount)) * 100, 100)

  // 2. Logic for Timeline
  const start = new Date(activeChallenge.start_date)
  start.setHours(0,0,0,0)
  const today = new Date()
  today.setHours(0,0,0,0)

  const baseAmount = Number(activeChallenge.daily_contribution)
  const currentDayIndex = Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1)
  const displayDayIndex = currentDayIndex > activeChallenge.duration_days ? activeChallenge.duration_days : currentDayIndex
  const todaysAmount = displayDayIndex * baseAmount

  // 3. Overdue calculation
  // Sum of AP up to (currentDayIndex - 1)
  const n = currentDayIndex - 1
  const expectedSumUpToYesterday = baseAmount * (n * (n + 1)) / 2
  const rawOverdue = expectedSumUpToYesterday - totalSaved
  const overdueAmount = rawOverdue > 0 ? rawOverdue : 0

  // 4. Generate all Slots for the UI
  const allSlots = Array.from({ length: activeChallenge.duration_days }).map((_, i) => {
    const dayOffset = i + 1
    const dayAmount = dayOffset * baseAmount
    const cumulativeRequired = baseAmount * (dayOffset * (dayOffset + 1)) / 2
    const dateStr = new Date(start.getTime() + (dayOffset - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    let status = 'Pending'
    if (totalSaved >= cumulativeRequired) {
      status = 'Paid'
    } else if (dayOffset < currentDayIndex) {
      status = 'Overdue'
    } else if (dayOffset === currentDayIndex) {
      status = 'Due Today'
    }

    return {
      id: dayOffset,
      rawAmount: dayAmount,
      amount: dayAmount.toFixed(2),
      date: dateStr,
      status,
      cumulativeRequired
    }
  })

  // 5. Filter for display
  const activeTransactions = [
    ...allSlots.filter(tx => tx.status === 'Overdue'),
    ...allSlots.filter(tx => tx.status === 'Due Today'),
    ...allSlots.filter(tx => tx.status === 'Paid' && tx.date === today.toISOString().split('T')[0]),
    ...allSlots.filter(tx => tx.status === 'Pending').slice(0, 5)
  ]

  return (
    <PesewaChallengeClient 
      user={user}
      activeChallenge={activeChallenge}
      totalSaved={totalSaved}
      progressPercentage={progressPercentage}
      currentDayIndex={currentDayIndex}
      todaysAmount={todaysAmount}
      overdueAmount={overdueAmount}
      activeTransactions={activeTransactions}
    />
  )
}
