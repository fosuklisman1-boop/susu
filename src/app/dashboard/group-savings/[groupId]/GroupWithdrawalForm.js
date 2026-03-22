'use client'

import { useState, useActionState } from 'react'
import { Landmark, Smartphone, CheckCircle, AlertCircle, Loader2, X, Wallet } from 'lucide-react'
import { createWithdrawal } from '../../withdraw/actions'

export default function GroupWithdrawalForm({ availableBalance, groupId, groupName, userEmail }) {
  const [isOpen, setIsOpen] = useState(false)
  const [method, setMethod] = useState('Mobile Money')
  const [amount, setAmount] = useState('')
  const [state, action, isPending] = useActionState(createWithdrawal, null)

  const isInvalid = amount && (Number(amount) <= 0 || Number(amount) > availableBalance)

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{ 
          width: '100%', 
          background: 'white', 
          color: 'var(--primary)', 
          border: '2px solid var(--primary)', 
          borderRadius: '12px', 
          padding: '16px', 
          fontSize: '1rem', 
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '12px',
          textTransform: 'uppercase'
        }}
      >
        <Wallet size={20} />
        Withdraw Group Funds
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '16px'
    }}>
      <div style={{
        background: 'white', width: '100%', maxWidth: '420px',
        maxHeight: '90vh', overflowY: 'auto',
        borderRadius: '24px', position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{ background: 'var(--primary)', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>Group Payout</h3>
            <p style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '2px' }}>Request funds for {groupName}</p>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {state?.success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ color: '#16a34a', marginBottom: '16px' }}>
                <CheckCircle size={64} style={{ margin: '0 auto' }} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#111827' }}>Request Submitted</h3>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '10px 0 24px' }}>
                Your withdrawal of <strong>GHS {Number(amount).toFixed(2)}</strong> is being processed. 
                Funds will be sent to your {method} account.
              </p>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          ) : (
            <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input type="hidden" name="groupId" value={groupId} />
              <input type="hidden" name="payout_method" value={method} />

              {state?.error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '12px', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertCircle size={16} />
                  {state.error}
                </div>
              )}

              {/* Available Balance Info */}
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '16px', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>GROUP BALANCE</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827' }}>GHS {availableBalance.toFixed(2)}</p>
                </div>
                <Wallet size={24} color="var(--primary)" opacity={0.5} />
              </div>

              {/* Amount Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>Amount to Withdraw</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '16px', fontWeight: '800', color: '#111827' }}>GHS</span>
                  <input 
                    type="number" 
                    name="amount" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    style={{ width: '100%', padding: '14px 14px 14px 54px', borderRadius: '14px', border: isInvalid ? '2px solid #ef4444' : '2px solid #f3f4f6', fontSize: '1.1rem', fontWeight: '700', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Payout Method */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px' }}>Method</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button"
                    onClick={() => setMethod('Mobile Money')}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: method === 'Mobile Money' ? '2px solid var(--primary)' : '1.5px solid #f3f4f6', background: method === 'Mobile Money' ? '#fff5f5' : 'white', cursor: 'pointer' }}
                  >
                    <Smartphone size={20} color={method === 'Mobile Money' ? 'var(--primary)' : '#9ca3af'} style={{ margin: '0 auto 4px' }} />
                    <p style={{ fontSize: '0.7rem', fontWeight: '700', color: method === 'Mobile Money' ? 'var(--primary)' : '#6b7280' }}>MoMo</p>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMethod('Bank Transfer')}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: method === 'Bank Transfer' ? '2px solid var(--primary)' : '1.5px solid #f3f4f6', background: method === 'Bank Transfer' ? '#fff5f5' : 'white', cursor: 'pointer' }}
                  >
                    <Landmark size={20} color={method === 'Bank Transfer' ? 'var(--primary)' : '#9ca3af'} style={{ margin: '0 auto 4px' }} />
                    <p style={{ fontSize: '0.7rem', fontWeight: '700', color: method === 'Bank Transfer' ? 'var(--primary)' : '#6b7280' }}>Bank</p>
                  </button>
                </div>
              </div>

              {/* Payout Details */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>Payout Details</label>
                <textarea 
                  name="payout_details"
                  required
                  placeholder={method === 'Mobile Money' ? 'MTN MoMo: 0244123456 (Name)' : 'Bank: Zenith, Acc: 1012345678 (Name)'}
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f3f4f6', minHeight: '80px', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isPending || isInvalid || !amount}
                style={{ padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (isPending || isInvalid || !amount) ? 0.6 : 1 }}
              >
                {isPending ? <Loader2 size={24} className="animate-spin" /> : 'Request Payout'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
