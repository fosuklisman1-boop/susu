'use client'

import { useState } from 'react'
import { X, CreditCard, Wallet, ArrowUpRight } from 'lucide-react'
import PaystackButton from './PaystackButton'
import MomoPaymentForm from './MomoPaymentForm'

/**
 * Unified Payment Modal
 * Provides a consistent UI for choosing between Paystack and MTN MoMo.
 */
export default function UnifiedPaymentModal({
  isOpen,
  onClose,
  amount,
  userEmail,
  userId = null,
  planId = null,
  groupId = null,
  metadata = {},
  onSuccess
}) {
  const [paymentMethod, setPaymentMethod] = useState(null) // 'paystack' or 'momo'

  if (!isOpen) return null

  const currentAmount = Number(amount || 0)

  return (
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
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}
        >
          <X size={20} color="#6b7280" />
        </button>

        {!paymentMethod ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '8px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Secure Checkout
              </p>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#111827', margin: 0 }}>
                <span style={{ fontSize: '1.2rem', verticalAlign: 'middle', marginRight: '4px' }}>GHS</span>
                {currentAmount.toFixed(2)}
              </h2>
            </div>

            <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center', letterSpacing: '1px' }}>
               Select Payment Method
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => setPaymentMethod('paystack')}
                style={{ 
                  width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #f3f4f6', 
                  background: 'white', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
                  transition: 'border-color 0.2s'
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
                onClick={() => setPaymentMethod('momo')}
                style={{ 
                  width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #f3f4f6', 
                  background: 'white', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer'
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
             <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', textAlign: 'center' }}>
               PAY VIA PAYSTACK
             </h3>
             <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem', marginBottom: '24px' }}>
               You will be redirected to the secure Paystack checkout page.
             </p>
             <PaystackButton 
               amount={currentAmount}
               email={userEmail}
               metadata={{ ...metadata, planId, groupId }}
               onSuccess={() => { if (onSuccess) onSuccess(); onClose(); }}
               buttonText={`PAY GHS ${currentAmount.toFixed(2)} NOW`}
               style={{ width: '100%', background: '#09a5db', color: 'white', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer' }}
             />
             <button onClick={() => setPaymentMethod(null)} style={{ width: '100%', marginTop: '12px', background: 'transparent', border: 'none', color: '#6b7280', fontWeight: '600', cursor: 'pointer' }}>
               Back to methods
             </button>
           </div>
        ) : (
          <MomoPaymentForm 
            amount={currentAmount}
            userId={userId}
            planId={planId}
            groupId={groupId}
            metadata={metadata}
            onSuccess={() => { if (onSuccess) onSuccess(); onClose(); }}
            onCancel={() => setPaymentMethod(null)}
          />
        )}
      </div>
    </div>
  )
}
