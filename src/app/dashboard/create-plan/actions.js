'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPlan(prevState, formData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const targetAmount = Number(formData.get('targetAmount'))
  const startDateStr = formData.get('startDate')
  const endDateStr = formData.get('endDate')
  const frequency = formData.get('frequency') || 'daily'
  const purpose = formData.get('purpose') || 'PesewasBox Savings'
  
  if (!targetAmount || !startDateStr || !endDateStr || !frequency || frequency === '') {
    return { error: 'Please fill in all required fields including a Pay Plan.' }
  }

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  if (end <= start) {
    return { error: 'End date must be after start date.' }
  }
  
  const durationMs = end - start
  const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)))

  let periodicContribution = 0
  if (frequency === 'daily') {
    periodicContribution = targetAmount / durationDays
  } else if (frequency === 'weekly') {
    const weeks = Math.max(1, durationDays / 7)
    periodicContribution = targetAmount / weeks
  } else if (frequency === 'monthly') {
    const months = Math.max(1, durationDays / 30)
    periodicContribution = targetAmount / months
  } else if (frequency === 'flex') {
    periodicContribution = 0
  }

  const { error } = await supabase
    .from('susu_plans')
    .insert({
      user_id: user.id,
      name: purpose,
      target_amount: targetAmount.toFixed(2),
      duration_days: durationDays,
      daily_contribution: periodicContribution.toFixed(2),
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      status: 'active',
      frequency: frequency,
      plan_type: 'standard'
    })

  if (error) {
    console.error('Error creating plan:', error)
    return { error: `Could not save plan: ${error.message}` }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true, message: `"${purpose}" plan created successfully!` }
}
