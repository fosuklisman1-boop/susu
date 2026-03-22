'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, AlertCircle, PlusCircle, CreditCard, Wallet } from 'lucide-react'
import PaystackButton from '@/components/PaystackButton'
import MomoPaymentForm from '@/components/MomoPaymentForm'

export default function GroupContributionForm({ 
  groupId, 
  userEmail, 
  isFixed = true, 
  fixedAmount = 0, 
  minAmount = 0 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState(null) // 'paystack' or 'momo'
  
  // Only treat as fixed if both the flag is true AND an amount > 0 exists
  const effectiveIsFixed = isFixed && Number(fixedAmount || 0) > 0
  const [amount, setAmount] = useState(effectiveIsFixed ? fixedAmount : (Number(minAmount) > 0 ? minAmount : ''))

  const currentAmount = Number(amount || 0)
  const currentMin = Number(minAmount || 0)
  const isInvalid = !effectiveIsFixed && currentAmount > 0 && currentAmount < currentMin

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Primary Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        style={{ 
          width: '100%', 
          background: 'var(--primary)', 
          color: 'white', 
          border: 'none', 
          borderRadius: '12px', 
          padding: '16px', 
          fontSize: effectiveIsFixed ? '1.1rem' : '1rem', 
          fontWeight: '800',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(198, 40, 40, 0.2)',
          textTransform: 'uppercase'
        }}
      >
        <PlusCircle size={20} />
        {effectiveIsFixed ? `CONTRIBUTE GHS ${currentAmount.toFixed(2)}` : 'MAKE A CONTRIBUTION'}
      </button>

      {/* Contribution Modal Overlay */}
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '420px',
            maxHeight: '90vh', overflowY: 'auto',
            padding: '24px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'modalFadeIn 0.3s ease-out'
          }}>
            <button 
              onClick={() => { setIsOpen(false); setPaymentMethod(null); }}
              style={{ position: 'absolute', right: '16px', top: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}
            >
              <X size={20} color="#6b7280" />
            </button>

            {!paymentMethod ? (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '20px', textAlign: 'center' }}>
                  YOUR CONTRIBUTION
                </h3>

                <div style={{ marginBottom: '24px' }}>
                  {effectiveIsFixed ? (
                    <div style={{ textAlign: 'center', background: '#fef2f2', padding: '20px', borderRadius: '16px', border: '1px solid #fee2e2' }}>
                      <p style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--primary)', margin: 0 }}>GHS {currentAmount.toFixed(2)}</p>
                    </div>
                  ) : (
                    <>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Enter Amount (GHS)
                      </label>
                      <input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{ width: '100%', padding: '16px', borderRadius: '14px', border: isInvalid ? '2px solid #ef4444' : '2px solid #f3f4f6', fontSize: '1.4rem', fontWeight: '800', outline: 'none' }}
                      />
                      {currentMin > 0 && <p style={{ fontSize: '0.75rem', color: isInvalid ? '#ef4444' : '#6b7280', marginTop: '6px' }}>Min: GHS {currentMin.toFixed(2)}</p>}
                    </>
                  )}
                </div>

                <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center', letterSpacing: '1px' }}>
                   CHOOSE PAYMENT METHOD
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    onClick={() => !isInvalid && currentAmount > 0 && setPaymentMethod('paystack')}
                    disabled={isInvalid || currentAmount <= 0}
                    style={{ 
                      width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #f3f4f6', 
                      background: 'white', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
                      opacity: (isInvalid || currentAmount <= 0) ? 0.5 : 1
                    }}
                  >
                    <div style={{ background: '#09a5db', color: 'white', padding: '10px', borderRadius: '10px' }}>
                      <CreditCard size={20} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Card / Bank / MoMo</p>
                      <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>Via Paystack Secure Gateway</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => !isInvalid && currentAmount > 0 && setPaymentMethod('momo')}
                    disabled={isInvalid || currentAmount <= 0}
                    style={{ 
                      width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #f3f4f6', 
                      background: 'white', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
                      opacity: (isInvalid || currentAmount <= 0) ? 0.5 : 1
                    }}
                  >
                    <div style={{ background: '#FDBE2C', color: '#000', padding: '10px', borderRadius: '10px' }}>
                      <Wallet size={20} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Direct MTN MoMo</p>
                      <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>Wallet-to-Wallet (Instant Prompt)</p>
                    </div>
                  </button>
                </div>
              </>
            ) : paymentMethod === 'paystack' ? (
               <div style={{ paddingTop: '20px' }}>
                <PaystackButton 
                  amount={currentAmount}
                  email={userEmail}
                  onSuccess={() => setIsOpen(false)}
                  buttonText="PROCEED WITH PAYSTACK"
                  metadata={{ groupId, contributor_name: userEmail }}
                  style={{ width: '100%', background: '#09a5db', color: 'white', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer' }}
                />
                <button onClick={() => setPaymentMethod(null)} style={{ width: '100%', marginTop: '12px', background: 'transparent', border: 'none', color: '#6b7280', fontWeight: '600' }}>Back</button>
               </div>
            ) : (
              <MomoPaymentForm 
                amount={currentAmount}
                userId={null} // Will be handled by the action
                onSuccess={() => setIsOpen(false)}
                onCancel={() => setPaymentMethod(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
