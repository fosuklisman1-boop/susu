'use client'

import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import UnifiedPaymentModal from '@/components/UnifiedPaymentModal'

export default function GroupContributionForm({ 
  groupId, 
  userEmail, 
  userId,
  isFixed = true, 
  fixedAmount = 0, 
  minAmount = 0,
  cycleNumber = null
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Only treat as fixed if both the flag is true AND an amount > 0 exists
  const effectiveIsFixed = isFixed && Number(fixedAmount || 0) > 0
  const [amount, setAmount] = useState(effectiveIsFixed ? fixedAmount : (Number(minAmount) > 0 ? minAmount : ''))

  const currentAmount = Number(amount || 0)
  const currentMin = Number(minAmount || 0)
  const isInvalid = !effectiveIsFixed && currentAmount > 0 && currentAmount < currentMin

  return (
    <div style={{ marginTop: '20px' }}>
      {!effectiveIsFixed && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>
            Enter Contribution Amount (GHS)
          </label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: isInvalid ? '2px solid #ef4444' : '2px solid #f3f4f6', fontSize: '1.2rem', fontWeight: '800', outline: 'none', boxSizing: 'border-box' }}
          />
          {currentMin > 0 && <p style={{ fontSize: '0.75rem', color: isInvalid ? '#ef4444' : '#6b7280', marginTop: '6px' }}>Minimum: GHS {currentMin.toFixed(2)}</p>}
        </div>
      )}

      {/* Primary Trigger Button */}
      <button 
        onClick={() => !isInvalid && currentAmount > 0 && setIsOpen(true)}
        disabled={isInvalid || currentAmount <= 0}
        style={{ 
          width: '100%', 
          background: 'var(--primary)', 
          color: 'white', 
          border: 'none', 
          borderRadius: '12px', 
          padding: '16px', 
          fontSize: effectiveIsFixed ? '1.1rem' : '1rem', 
          fontWeight: '800',
          cursor: (isInvalid || currentAmount <= 0) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(198, 40, 40, 0.2)',
          textTransform: 'uppercase',
          opacity: (isInvalid || currentAmount <= 0) ? 0.6 : 1
        }}
      >
        <PlusCircle size={20} />
        {effectiveIsFixed ? `CONTRIBUTE GHS ${currentAmount.toFixed(2)}` : 'PROCEED TO PAYMENT'}
      </button>

      <UnifiedPaymentModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        amount={currentAmount}
        userEmail={userEmail}
        userId={userId}
        groupId={groupId}
        metadata={{ 
          type: 'group_contribution', 
          contributor_name: userEmail,
          memo: `Contribution for Group ${groupId}`,
          cycle_number: cycleNumber
        }}
      />
    </div>
  )
}
