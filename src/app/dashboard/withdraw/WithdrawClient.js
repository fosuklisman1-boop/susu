'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wallet, Landmark, Smartphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createWithdrawal } from './actions'
import { useToast } from '@/components/ToastProvider'

export default function WithdrawClient({ availableBalance, userEmail, groupId, groupName, isGroup, savedMethods = [] }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [method, setMethod] = useState('MTN MoMo (Direct)')
  const [state, action, isPending] = useActionState(createWithdrawal, null)

  useEffect(() => {
    if (state?.success) {
      showToast(`Withdrawal of GHS ${Number(state.amount).toFixed(2)} submitted!`, 'success')
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state, showToast])

  const [amount, setAmount] = useState('')
  const [payoutDetails, setPayoutDetails] = useState('')
  const [saveAccount, setSaveAccount] = useState(false)

  // Auto-fill default method if available
  useState(() => {
    const defaultMethod = savedMethods.find(m => m.is_default)
    if (defaultMethod) {
      setPayoutDetails(defaultMethod.account_number)
      setMethod(defaultMethod.provider === 'momo_mtn' ? 'MTN MoMo (Direct)' : 'Bank Transfer')
    }
  }, [savedMethods])

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '100px' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href={isGroup ? `/dashboard/group-savings/${groupId}` : "/dashboard"} style={{ color: 'white' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>
          {isGroup ? `Withdraw from ${groupName}` : 'Request Payout'}
        </h2>
      </div>

      <div style={{ padding: '20px' }}>
        
        {/* Balance Card */}
        <div style={{ background: 'var(--primary-gradient)', borderRadius: '20px', padding: '24px', color: 'white', marginBottom: '24px', boxShadow: '0 8px 16px rgba(198, 40, 40, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', opacity: 0.9 }}>
            <Wallet size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Available to Withdraw</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '600', marginRight: '6px' }}>GHS</span>
            {availableBalance.toFixed(2)}
          </h1>
          <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Funds from completed saving cycles and verified contributions.</p>
        </div>

        {state?.success ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '20px' }}>
            <div style={{ color: '#16a34a', marginBottom: '16px' }}>
              <CheckCircle size={64} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>Request Submitted!</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Your withdrawal of <strong>GHS {Number(state.amount).toFixed(2)}</strong> is being processed. 
              We'll notify you once it's approved.
            </p>
            <Link href="/dashboard/history" style={{ display: 'block', background: 'var(--primary)', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
              View Status in History
            </Link>
          </div>
        ) : (
          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {state?.error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '14px', color: '#b91c1c', fontSize: '0.9rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <AlertCircle size={18} />
                {state.error}
              </div>
            )}

            {/* Amount Input */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px' }}>
                How much would you like to withdraw?
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '16px', fontWeight: '700', color: '#111827', fontSize: '1.1rem' }}>GHS</span>
                <input 
                  type="number" 
                  name="amount" 
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '16px 16px 16px 56px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1.2rem', fontWeight: '700', outline: 'none' }}
                />
              </div>
              {amount && Number(amount) > availableBalance && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '8px', fontWeight: '600' }}>
                  ⚠️ Amount exceeds your available balance!
                </p>
              )}
            </div>

            {/* Payout Method */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Select Payout Method
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div 
                  onClick={() => setMethod('MTN MoMo (Direct)')}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: method === 'MTN MoMo (Direct)' ? '2px solid #FDBE2C' : '1px solid #e5e7eb', background: method === 'MTN MoMo (Direct)' ? '#fffbeb' : 'white', textAlign: 'center', cursor: 'pointer' }}
                >
                  <Smartphone size={24} color={method === 'MTN MoMo (Direct)' ? '#d97706' : '#9ca3af'} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '0.75rem', fontWeight: '700' }}>MoMo Direct</p>
                </div>
                <div 
                  onClick={() => setMethod('Bank Transfer')}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: method === 'Bank Transfer' ? '2px solid var(--primary)' : '1px solid #e5e7eb', background: method === 'Bank Transfer' ? '#fff5f5' : 'white', textAlign: 'center', cursor: 'pointer' }}
                >
                  <Landmark size={24} color={method === 'Bank Transfer' ? 'var(--primary)' : '#9ca3af'} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '0.75rem', fontWeight: '700' }}>Bank</p>
                </div>
              </div>
              <input type="hidden" name="payout_method" value={method} />
              {isGroup && <input type="hidden" name="groupId" value={groupId} />}
            </div>

            {/* Saved Methods (if any) */}
            {savedMethods.length > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Use a Saved Account?
                </p>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {savedMethods.map((sm, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        setPayoutDetails(sm.account_number)
                        setMethod(sm.provider === 'momo_mtn' ? 'MTN MoMo (Direct)' : 'Bank Transfer')
                      }}
                      style={{ 
                        flexShrink: 0, padding: '10px 14px', borderRadius: '10px', 
                        background: payoutDetails === sm.account_number ? '#1e293b' : 'white',
                        color: payoutDetails === sm.account_number ? 'white' : '#1e293b',
                        border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                      }}
                    >
                      {sm.account_number} {sm.is_default && '⭐'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payout Details */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {method.includes('MoMo') ? 'Mobile Money Number' : 'Bank Account Details'}
              </label>
              <textarea 
                name="payout_details" 
                required
                value={payoutDetails}
                onChange={(e) => setPayoutDetails(e.target.value)}
                placeholder={method.includes('MoMo') ? 'e.g. 0244123456' : 'e.g. Zenith Bank - 1012345678 (Kwame Mensah)'}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '0.9rem', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }}
              />
              
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="save_account" 
                  name="save_account"
                  checked={saveAccount}
                  onChange={(e) => setSaveAccount(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="save_account" style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: '600' }}>
                  Save this account for future use
                </label>
              </div>

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                Make sure your details are correct to avoid payout delays.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={isPending || !amount || Number(amount) <= 0 || Number(amount) > availableBalance}
              style={{ padding: '18px', background: 'var(--primary)', color: 'white', borderRadius: '14px', border: 'none', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: (isPending || !amount || Number(amount) <= 0 || Number(amount) > availableBalance) ? 0.6 : 1 }}
            >
              {isPending ? <Loader2 size={24} className="animate-spin" /> : 'Confirm Withdrawal Request'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Payouts are typically processed within 24 hours.
            </p>
          </form>
        )}

      </div>
    </div>
  )
}
