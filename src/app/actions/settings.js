'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Fetches the global site settings (WhatsApp links, Support Phone, etc.)
 */
export async function getSiteSettings() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()
    
  if (error) {
    console.error('Error fetching site settings:', error)
    return null
  }
  
  return data
}
