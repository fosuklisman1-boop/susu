'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState, formData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const fullName = formData.get('full_name')?.trim()
  const phoneNumber = formData.get('phone_number')?.trim()

  if (!fullName || !phoneNumber) {
    return { error: 'Please provide both your full name and phone number.' }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      phone_number: phoneNumber,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error updating profile:', error)
    return { error: 'Failed to update profile. Please try again.' }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard', 'layout')
  
  return { success: true }
}
