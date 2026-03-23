'use client'

import { useState } from 'react'
import { ArrowUp, ArrowDown, Save, User as UserIcon, Lock } from 'lucide-react'
import { updateMemberPayoutOrder } from '../../actions'
import { useRouter } from 'next/navigation'

export default function PayoutOrderManager({ groupId, initialMembers, currentCycle }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Initial sort logic matching the detail page
  const sortedInitial = [...initialMembers].sort((a, b) => {
    const orderA = a.payout_order ?? 999
    const orderB = b.payout_order ?? 999
    if (orderA !== orderB) return orderA - orderB
    return new Date(a.created_at) - new Date(b.created_at)
  })

  const [members, setMembers] = useState(sortedInitial)

  const handleMove = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= members.length) return
    
    // Safety: Cannot move members who have already been paid (index < currentCycle - 1)
    if (index < currentCycle - 1 || newIndex < currentCycle - 1) return

    const newMembers = [...members]
    const temp = newMembers[index]
    newMembers[index] = newMembers[newIndex]
    newMembers[newIndex] = temp
    setMembers(newMembers)
    setSuccess(false)
    setError('')
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess(false)

    // Map members to their new indices (1-indexed for payout_order)
    const orderMapping = {}
    members.forEach((m, idx) => {
      orderMapping[m.user_id] = idx + 1
    })

    const result = await updateMemberPayoutOrder(groupId, orderMapping)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      router.refresh()
    }
    setIsSaving(false)
  }

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>🔄 Payout Order Management</h3>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
            Change the positions of members for upcoming payouts. 
            Members already paid or currently due are locked.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{ 
            background: '#1f2937', color: 'white', border: 'none', borderRadius: '10px', 
            padding: '10px 18px', fontSize: '0.85rem', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? 'Saving...' : <><Save size={16} /> Save Order</>}
        </button>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '16px', padding: '10px', background: '#fef2f2', borderRadius: '8px' }}>{error}</p>}
      {success && <p style={{ color: '#16a34a', fontSize: '0.85rem', marginBottom: '16px', padding: '10px', background: '#f0fdf4', borderRadius: '8px' }}>Order updated successfully!</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {members.map((m, i) => {
          const isLocked = i < currentCycle - 1
          const isDue = i === currentCycle - 1
          const isFirstMovable = i === currentCycle - 1
          const isLast = i === members.length - 1

          return (
            <div key={m.user_id} style={{ 
              display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', 
              background: isLocked ? '#f9fafb' : (isDue ? '#fffdf0' : 'white'), 
              borderRadius: '12px', border: `1px solid ${isDue ? '#fef08a' : '#f3f4f6'}`,
              transition: 'all 0.2s ease',
              boxShadow: isDue ? '0 4px 12px rgba(254, 240, 138, 0.2)' : 'none'
            }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: isDue ? '#fbbf24' : (isLocked ? '#e5e7eb' : '#1f2937'), 
                color: isDue || !isLocked ? 'white' : '#6b7280', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem'
              }}>
                {i + 1}
              </div>
              
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={18} color="#6b7280" />
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: '700', color: isLocked ? '#6b7280' : '#111827' }}>
                    {m.profiles?.full_name || 'Member ' + (i + 1)}
                    {isLocked && <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#e5e7eb', color: '#4b5563', padding: '2px 6px', borderRadius: '4px' }}>PAID / LOCKED</span>}
                    {isDue && <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px' }}>CURRENTLY DUE</span>}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    {isLocked ? 'Cycle completed' : (isDue ? 'Can be moved to change next recipient' : 'Upcoming position')}
                  </p>
                </div>
              </div>

              {!isLocked && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => handleMove(i, -1)}
                    disabled={isFirstMovable}
                    style={{ 
                      padding: '8px', borderRadius: '8px', background: isFirstMovable ? '#f9fafb' : '#f3f4f6', 
                      border: 'none', cursor: isFirstMovable ? 'not-allowed' : 'pointer', color: isFirstMovable ? '#d1d5db' : '#4b5563'
                    }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    onClick={() => handleMove(i, 1)}
                    disabled={isLast}
                    style={{ 
                      padding: '8px', borderRadius: '8px', background: isLast ? '#f9fafb' : '#f3f4f6', 
                      border: 'none', cursor: isLast ? 'not-allowed' : 'pointer', color: isLast ? '#d1d5db' : '#4b5563'
                    }}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              )}
              {isLocked && <Lock size={16} color="#d1d5db" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
