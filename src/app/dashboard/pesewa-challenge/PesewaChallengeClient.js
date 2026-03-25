'use client'

import { useState } from 'react'
import { ArrowUpRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import UnifiedPaymentModal from '@/components/UnifiedPaymentModal'

export default function PesewaChallengeClient({ 
  user, 
  activeChallenge, 
  totalSaved, 
  progressPercentage, 
  currentDayIndex, 
  todaysAmount, 
  overdueAmount, 
  activeTransactions 
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
      amount: Number(amount),
      metadata: { ...metadata, plan_id: activeChallenge.id, type: 'pesewa_challenge' }
    })
  }

  const closePayment = () => {
    setPaymentState(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', padding: '16px', paddingBottom: '100px' }}>
      
      {/* Header */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GHS {totalSaved.toFixed(2)}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Saved</p>
          </div>
          <div style={{ background: '#b71c1c', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {Math.max(activeChallenge.duration_days - (currentDayIndex - 1), 0)} DAY'S LEFT
          </div>
        </div>

        {/* Pending Block */}
        <div style={{ background: '#170b24', borderRadius: '16px', padding: '20px', textAlign: 'center', color: 'white' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '4px' }}>PENDING</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Todays Amount: GHS {todaysAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Stats Card */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#b71c1c', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
              Stp
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Amount Saved</p>
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>GHS {totalSaved.toFixed(2)}</h3>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Expected Goal</p>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>GHS {Number(activeChallenge.target_amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</h3>
          </div>

        </div>
        
        {/* Progress Bar */}
        <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', width: '100%', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercentage}%`, background: '#ef4444', height: '100%' }}></div>
        </div>
      </div>

      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>Due & Pending Transactions</h3>

      {/* Pay All Overdue Button */}
      {overdueAmount > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
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

      {/* Transaction List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeTransactions.map((tx) => (
          <div 
            key={tx.id} 
            style={{ 
              background: tx.status === 'Paid' ? '#f0fdf4' : (tx.status === 'Due Today' ? '#fffbeb' : 'white'), 
              borderRadius: '16px', 
              padding: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              border: tx.status === 'Paid' ? '1px solid #bcf0da' : (tx.status === 'Due Today' ? '1px solid #f59e0b' : '1px solid transparent'),
              opacity: tx.status === 'Paid' ? 0.8 : 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: tx.status === 'Paid' ? '#16a34a' : 'linear-gradient(135deg, #4c0519 0%, #170b24 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800' }}>
                {tx.status === 'Paid' ? '✓' : ''}
                {tx.status !== 'Paid' && <div style={{ position: 'absolute', bottom: '6px', left: '6px', width: '12px', height: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '4px' }}></div>}
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ 
                    background: tx.status === 'Paid' ? '#16a34a' : (tx.status === 'Overdue' ? '#ef4444' : (tx.status === 'Due Today' ? '#f59e0b' : '#9ca3af')), 
                    color: 'white', 
                    fontSize: '0.65rem', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontWeight: '600' 
                  }}>
                    {tx.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.status === 'Paid' ? 'Savings recorded' : 'Expect to pay'}</span>
                </div>
                <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                  GHS {Number(tx.amount).toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '400' }}>on {tx.date}</span>
                </p>
              </div>
            </div>

            <button 
              onClick={() => tx.status !== 'Paid' && openPayment(tx.rawAmount, { type: 'slot_payment', dayIndex: tx.id })}
              disabled={tx.status === 'Paid'} 
              style={{ background: tx.status === 'Paid' ? '#e5e7eb' : '#ef4444', color: 'white', width: '36px', height: '36px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: tx.status === 'Paid' ? 'not-allowed' : 'pointer' }}
            >
              <ArrowUpRight size={18} color={tx.status === 'Paid' ? '#9ca3af' : 'white'} />
            </button>
          </div>
        ))}
      </div>

      {/* The Unified Modal */}
      <UnifiedPaymentModal 
        isOpen={paymentState.isOpen}
        onClose={closePayment}
        amount={paymentState.amount}
        userEmail={user.email}
        userId={user.id}
        planId={activeChallenge.id}
        metadata={paymentState.metadata}
        onSuccess={() => {
          router.refresh()
          console.log('Pesewa Challenge Payment Successful')
        }}
      />

    </div>
  )
}
