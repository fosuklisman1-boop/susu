'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Target, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import UnifiedPaymentModal from '@/components/UnifiedPaymentModal'

export default function PesewaBoxClient({ 
  user, 
  plan, 
  totalSaved, 
  progressPercentage, 
  daysLeft, 
  periodicAmount, 
  overdueAmount, 
  remaining, 
  visibleSlots, 
  contributions,
  freqLabel
}) {
  const router = useRouter()
  const [paymentState, setPaymentState] = useState({
    isOpen: false,
    amount: 0,
    metadata: {}
  })

  const openPayment = (amount, metadata = {}) => {
    setPaymentState({
      isOpen: true,
      amount,
      metadata: { ...metadata, plan_id: plan.id }
    })
  }

  const closePayment = () => {
    setPaymentState(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '100px' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard" style={{ color: 'white', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', flex: 1 }}>{plan.name || 'Savings Plan'}</h2>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Top Banner */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GHS {totalSaved.toFixed(2)}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Saved</p>
            </div>
            <div style={{ background: '#b71c1c', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {daysLeft} DAY'S LEFT
            </div>
          </div>

          <div style={{ background: '#170b24', borderRadius: '16px', padding: '20px', textAlign: 'center', color: 'white' }}>
            {plan.frequency === 'flex' ? (
              <>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '4px' }}>FLEXIBLE</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Pay any amount at any time</p>
              </>
            ) : (
              <>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>{freqLabel}</p>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>GHS {periodicAmount.toFixed(2)}</h2>
              </>
            )}
          </div>
        </div>

        {/* Stats / Progress Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#22c55e', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={20} />
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Amount Saved</p>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>GHS {totalSaved.toFixed(2)}</h3>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Expected Goal</p>
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>GHS {Number(plan.target_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
          <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercentage}%`, background: '#22c55e', height: '100%', borderRadius: '3px' }}></div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '6px' }}>{progressPercentage.toFixed(1)}% complete</p>
        </div>

        {/* ── Due & Pending Payments ─────────────────────────────────── */}
        {plan.frequency !== 'flex' && (
          <>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>Due & Pending Payments</h3>

            {/* Overdue Card */}
            {overdueAmount > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ color: '#b91c1c', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Overdue Balance</p>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#7f1d1d' }}>GHS {overdueAmount.toFixed(2)}</h3>
                </div>
                <button 
                  onClick={() => openPayment(overdueAmount, { type: 'overdue_payment' })}
                  style={{ background: '#b91c1c', color: 'white', padding: '10px 16px', borderRadius: '10px', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  PAY ALL <ArrowUpRight size={16} />
                </button>
              </div>
            )}

            {/* Payment Slot List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {visibleSlots.map((slot) => (
                <div 
                  key={slot.index} 
                  style={{ 
                    background: slot.status === 'Due Today' ? '#fffbeb' : 'white', 
                    borderRadius: '16px', 
                    padding: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    border: slot.status === 'Due Today' ? '1px solid #f59e0b' : '1px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>
                      #{slot.index}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          background: slot.status === 'Overdue' ? '#ef4444' : (slot.status === 'Due Today' ? '#f59e0b' : '#9ca3af'), 
                          color: 'white', 
                          fontSize: '0.65rem', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontWeight: '600' 
                        }}>
                          {slot.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expect to pay</span>
                      </div>
                      <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                        GHS {slot.amount.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '400' }}>on {slot.dueDate}</span>
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => openPayment(slot.amount, { type: 'slot_payment', slotIndex: slot.index })}
                    style={{ background: '#ef4444', color: 'white', width: '36px', height: '36px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Flex Plan – Pay Remaining */}
        {plan.frequency === 'flex' && (
          <>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>Make a Payment</h3>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>Remaining</p>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b71c1c', marginBottom: '16px' }}>GHS {remaining.toFixed(2)}</h2>
              <button 
                onClick={() => openPayment(remaining, { type: 'flex_payment' })}
                style={{ width: '100%', background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
              >
                PAY NOW <ArrowUpRight size={18} />
              </button>
            </div>
          </>
        )}

        {/* Payment History */}
        {contributions?.length > 0 && (
          <>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>Payment History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contributions.map((c, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</p>
                  <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '0.85rem', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>
                    + GHS {Number(c.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* The Unified Modal */}
      <UnifiedPaymentModal 
        isOpen={paymentState.isOpen}
        onClose={closePayment}
        amount={paymentState.amount}
        userEmail={user.email}
        userId={user.id}
        planId={plan.id}
        metadata={paymentState.metadata}
        onSuccess={() => {
          // Trigger a server-side refresh to show updated balances
          router.refresh();
          console.log('Payment Successful - Refreshing data');
        }}
      />
    </div>
  )
}
