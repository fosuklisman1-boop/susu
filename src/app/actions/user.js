'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Fetches the public profile for the currently authenticated user
 */
export async function getUserProfile() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
    
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data
}

/**
 * Fetches the current user's wallet balance
 */
export async function getUserWallet() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()
    
  if (error) {
    console.error('Error fetching user wallet:', error)
    return { balance: 0 }
  }
  
  return data
}

/**
 * Fetches saved payment methods for the user
 */
export async function getUserPaymentMethods() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const { data, error } = await supabase
    .from('user_payment_methods')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    
  if (error) {
    console.error('Error fetching payment methods:', error)
    return []
  }
  
  return data
}

/**
 * Saves a new payment method or updates default
 */
export async function savePaymentMethod(provider, accountNumber, accountName, isDefault = false) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  
  // If setting as default, unset others first
  if (isDefault) {
    await supabase
      .from('user_payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id)
  }
  
  const { data, error } = await supabase
    .from('user_payment_methods')
    .upsert({
      user_id: user.id,
      provider,
      account_number: accountNumber,
      account_name: accountName,
      is_default: isDefault
    }, { onConflict: 'user_id, account_number' })
    .select()
    
  if (error) {
    console.error('Error saving payment method:', error)
    return { error: 'Failed to save payment method' }
  }
  
  return { success: true, data }
}
