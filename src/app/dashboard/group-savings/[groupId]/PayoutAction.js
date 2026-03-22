'use client'

import { useState } from 'react'
import { recordGroupPayout } from '@/app/dashboard/group-savings/actions'
import { Loader2, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'

export default function PayoutAction({ groupId, recipientId, amount, currentCycle, isAdmin }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isAdmin) return null

  const handlePayout = async () => {
    if (!confirm(`Confirm payout of GHS ${amount.toFixed(2)} for Cycle ${currentCycle}? This will advance the group to the next cycle.`)) return
    
    setLoading(true)
    const result = await recordGroupPayout(groupId, recipientId, amount, currentCycle)
    setLoading(false)
    
    if (result.success) {
      setSuccess(true)
      showToast(`Payout for Cycle ${currentCycle} recorded successfully!`, 'success')
    } else {
      showToast(result.error || 'Failed to record payout', 'error')
    }
  }

  if (success) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: '700', fontSize: '0.85rem' }}>
        <CheckCircle size={16} /> Paid
      </div>
    )
  }

  return (
    <button 
      onClick={handlePayout}
      disabled={loading}
      style={{ 
        background: '#16a34a', color: 'white', border: 'none', 
        borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', 
        fontWeight: '700', cursor: 'pointer', display: 'flex', 
        alignItems: 'center', gap: '6px' 
      }}
    >
      {loading ? <Loader2 className="animate-spin" size={14} /> : 'Record Payout'}
    </button>
  )
}
