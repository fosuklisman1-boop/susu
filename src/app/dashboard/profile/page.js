import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import ProfileForm from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard" style={{ color: 'white' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '600', flex: 1 }}>Account Profile</h2>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '30px 20px', textAlign: 'center', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-light)', 
            color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '2rem', fontWeight: '700'
          }}>
            {profile?.full_name?.[0] || user.email[0].toUpperCase()}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '4px' }}>
            {profile?.full_name || 'Set your name'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</p>
        </div>

        <ProfileForm profile={profile} userEmail={user.email} />
      </div>
    </div>
  )
}
