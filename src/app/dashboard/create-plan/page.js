'use client'

import { createPlan } from './actions'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      disabled={pending}
      style={{ 
        width: '100%', 
        background: '#4ade80',
        color: 'white', 
        border: 'none', 
        borderRadius: '12px', 
        padding: '18px', 
        fontSize: '1.05rem', 
        fontWeight: '700', 
        letterSpacing: '0.5px',
        cursor: pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.7 : 1,
        marginTop: '8px'
      }}
    >
      {pending ? 'SAVING...' : 'START SAVING'}
    </button>
  )
}

export default function CreatePlanPage() {
  const { showToast } = useToast()
  const router = useRouter()
  const [state, formAction] = useActionState(createPlan, null)

  // Controlled state so values survive error re-renders
  const [fields, setFields] = useState({
    purpose: '',
    targetAmount: '',
    frequency: '',
    initialAmount: '',
    startDate: '',
    endDate: '',
  })

  const handle = (e) => setFields(prev => ({ ...prev, [e.target.name]: e.target.value }))

  useEffect(() => {
    if (state?.success) {
      showToast(state.message || 'Plan created successfully!', 'success')
      setTimeout(() => router.push('/dashboard'), 1200)
    }
    if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '0.95rem',
    outline: 'none',
    background: 'white',
    color: '#111827'
  }
  
  const labelStyle = {
    display: 'block',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
    fontSize: '0.95rem'
  }

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '40px' }}>
      
      {/* Red Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>PesewasBox Savings</h2>
        <Link href="/dashboard" style={{ position: 'absolute', right: '24px', background: 'white', color: 'var(--primary)', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </Link>
      </div>

      <div style={{ padding: '24px' }}>
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={labelStyle}>Purpose for this savings</label>
            <input type="text" name="purpose" placeholder="Saving for Books"
              value={fields.purpose} onChange={handle}
              style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Your Target Amount Expected</label>
            <input type="number" name="targetAmount" placeholder="1000"
              value={fields.targetAmount} onChange={handle}
              style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>How do you want your savings?</label>
            <select name="frequency"
              value={fields.frequency} onChange={handle}
              style={{...inputStyle, WebkitAppearance: 'none', appearance: 'none'}} required>
              <option value="" disabled>Choose A Pay Plan</option>
              <option value="flex">Pay any amount anytime</option>
              <option value="daily">Pay Daily - Split my target goal per day</option>
              <option value="weekly">Pay Weekly - Split my target goal per week</option>
              <option value="monthly">Pay Monthly - Split my target goal per month</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>How much money will you starting with?</label>
            <input type="number" name="initialAmount" placeholder="10.00"
              value={fields.initialAmount} onChange={handle}
              style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" name="startDate"
              value={fields.startDate} onChange={handle}
              style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Ending Date</label>
            <input type="date" name="endDate"
              value={fields.endDate} onChange={handle}
              style={inputStyle} required />
          </div>

          {/* Platform Fee Box */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>Platform fee</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>This Goal will automatically incur a 5% Charge.</p>
            <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem' }}>
              Add a 5% fee.
            </div>
          </div>

          <SubmitButton />

        </form>
      </div>

    </div>
  )
}
