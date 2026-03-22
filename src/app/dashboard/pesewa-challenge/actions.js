'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createChallenge(formData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const baseAmount = Number(formData.get('baseAmount'))
  const durationDays = Number(formData.get('durationDays'))
  const startDateStr = formData.get('startDate') // YYYY-MM-DD
  
  if (!baseAmount || !durationDays || !startDateStr) {
    console.error('Missing required fields for challenge')
    return { error: 'Missing required fields' }
  }

  const start = new Date(startDateStr)
  // Calculate End Date
  const end = new Date(start)
  end.setDate(end.getDate() + durationDays - 1)

  // Arithmetic Progression: Total = Base * (N * (N+1) / 2)
  const targetAmount = baseAmount * (durationDays * (durationDays + 1) / 2)

  // We store baseAmount in the daily_contribution column
  // This allows the front-end to know what the Day 1 seed value was
  const { error } = await supabase
    .from('susu_plans')
    .insert({
      user_id: user.id,
      target_amount: targetAmount.toFixed(2),
      duration_days: durationDays,
      daily_contribution: baseAmount.toFixed(2),
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      status: 'active',
      plan_type: 'pesewa_challenge' // THE MAGIC COLUMN
    })

  if (error) {
    console.error('Error creating challenge:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/pesewa-challenge')
  redirect('/dashboard/pesewa-challenge')
}
