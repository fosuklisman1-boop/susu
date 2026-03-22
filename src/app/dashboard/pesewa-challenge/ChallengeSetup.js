'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Target, Info, Sparkles } from 'lucide-react'
import { createChallenge } from './actions'
import { useFormStatus } from 'react-dom'

function SubmitButton({ disabled }) {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit"
      disabled={disabled || pending}
      style={{ width: '100%', background: '#b71c1c', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(183, 28, 28, 0.4)', opacity: (disabled || pending) ? 0.5 : 1 }}
    >
      <Sparkles size={20} /> {pending ? 'SAVING...' : 'START THE CHALLENGE'}
    </button>
  )
}

export default function ChallengeSetup() {
  const [baseAmount, setBaseAmount] = useState('1')
  const [durationDays, setDurationDays] = useState('365')
  const [startDate, setStartDate] = useState('')

  // Arithmetic Progression Formula: Total = Base * (N * (N + 1) / 2)
  const d = Number(durationDays) || 0
  const expectedTarget = baseAmount && d > 0 
    ? (Number(baseAmount) * (d * (d + 1)) / 2).toLocaleString('en-US', {minimumFractionDigits: 2}) 
    : '0.00'

  return (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      
      <div style={{ background: 'white', borderRadius: '24px', padding: '40px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <div style={{ width: '80px', height: '80px', background: '#fee2e2', color: '#b71c1c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Target size={40} />
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>
          Custom <span style={{ color: '#b71c1c' }}>Pesewa Challenge</span>
        </h1>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
          Set your dream goal and the duration you want to achieve it. The system will calculate exactly how much you need to save daily to hit your target!
        </p>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#fffbeb', color: '#b45309', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
          <Info size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
            This challenge requires daily commitment. Set your parameters below to generate your unique savings calendar!
          </p>
        </div>

        <form action={createChallenge}>
          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111827', fontSize: '0.9rem' }}>Day 1 Starting Amount (GHS)</label>
            <input 
              type="number" 
              name="baseAmount"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              placeholder="e.g. 1.00" 
              step="0.1"
              required
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '16px', display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111827', fontSize: '0.9rem' }}>Duration (Days)</label>
              <input 
                type="number" 
                name="durationDays"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="365" 
                required
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111827', fontSize: '0.9rem' }}>Start Date</label>
              <input 
                type="date" 
                name="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none', background: 'white' }}
              />
            </div>
          </div>

          {/* Live Calculation Display */}
          <div style={{ background: '#f8f9fa', borderRadius: '16px', padding: '20px', marginBottom: '32px', border: '2px dashed #b71c1c' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Your Expected Target Goal will be</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#b71c1c' }}>GHS {expectedTarget}</h2>
          </div>

          <SubmitButton disabled={!baseAmount || !durationDays || !startDate} />
        </form>

      </div>

      <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500', textDecoration: 'underline' }}>
        Maybe Later
      </Link>

    </div>
  )
}
