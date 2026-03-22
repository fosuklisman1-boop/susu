'use client'

import { useState, useActionState } from 'react'
import { Save, Phone, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { updateProfile } from './actions'

export default function ProfileForm({ profile, userEmail }) {
  const [state, action, isPending] = useActionState(updateProfile, null)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '')

  const isSuccess = state?.success

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #e5e7eb',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#f9fafb'
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {isSuccess && (
        <div style={{ 
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', 
          padding: '14px', borderRadius: '12px', fontSize: '0.9rem', 
          display: 'flex', alignItems: 'center', gap: '10px' 
        }}>
          <CheckCircle size={18} />
          Profile updated successfully!
        </div>
      )}

      {state?.error && (
        <div style={{ 
          background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', 
          padding: '14px', borderRadius: '12px', fontSize: '0.9rem', 
          display: 'flex', alignItems: 'center', gap: '10px' 
        }}>
          <AlertCircle size={18} />
          {state.error}
        </div>
      )}

      <div>
        <label style={labelStyle}>Full Name</label>
        <div style={{ position: 'relative' }}>
          <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input 
            type="text" 
            name="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            style={{ ...inputStyle, paddingLeft: '44px' }}
            required
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Phone Number</label>
        <div style={{ position: 'relative' }}>
          <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input 
            type="tel" 
            name="phone_number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="024 XXX XXXX"
            style={{ ...inputStyle, paddingLeft: '44px' }}
            required
          />
        </div>
      </div>

      <div style={{ padding: '16px', borderRadius: '12px', background: '#f3f4f6', fontSize: '0.85rem', color: '#6b7280' }}>
        <p><strong>Email Address:</strong> {userEmail}</p>
        <p style={{ marginTop: '4px', fontSize: '0.75rem' }}>Your email is used for login and cannot be manually changed here.</p>
      </div>

      <button 
        type="submit" 
        disabled={isPending}
        style={{
          width: '100%', padding: '16px', borderRadius: '12px', 
          background: 'var(--primary)', color: 'white', border: 'none',
          fontSize: '1.05rem', fontWeight: '700', cursor: isPending ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginTop: '10px'
        }}
      >
        {isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
        {isPending ? 'SAVING...' : 'SAVE CHANGES'}
      </button>
    </form>
  )
}
