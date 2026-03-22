'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Fetches the notifications for the currently authenticated user
 */
export async function getNotifications() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
    
  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
  
  return data
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(notificationId) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    
  if (error) {
    console.error('Error marking notification as read:', error)
    return { success: false }
  }
  
  return { success: true }
}
