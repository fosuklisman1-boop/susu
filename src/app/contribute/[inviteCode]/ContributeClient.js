'use client'

import { useState } from 'react'
import { Heart, Users, Share2, Check } from 'lucide-react'
import UnifiedPaymentModal from '@/components/UnifiedPaymentModal'

export default function ContributeClient({ group, totalRaised, targetAmount, progressPct, recentContributors }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(group.is_fixed_contribution ? String(group.contribution_amount) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenModal = (e) => {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!amount || numAmount <= 0) return setError('Please enter a valid amount.')
    
    // Min contribution check
    if (group.min_contribution_amount > 0 && numAmount < group.min_contribution_amount) {
      return setError(`Minimum contribution for this group is GHS ${group.min_contribution_amount}`)
    }

    if (!email) return setError('Email is required for payment processing.')
    setError(null)
    setIsModalOpen(true)
  }

  const quickAmounts = [10, 20, 50, 100, 200, 500]

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', paddingBottom: '40px', fontFamily: 'var(--font-inter, sans-serif)' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%)', color: 'white', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem' }}>
          <Heart size={32} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>{group.name}</h1>
        <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>Help us reach our goal by contributing below</p>
      </div>

      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Progress Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>Total Raised</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>GHS {totalRaised.toFixed(2)}</h2>
            </div>
            {targetAmount > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>Goal</p>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>GHS {targetAmount.toLocaleString()}</h2>
              </div>
            )}
          </div>
          {targetAmount > 0 && (
            <>
              <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #d32f2f, #ef4444)', height: '100%', borderRadius: '4px', transition: 'width 0.5s' }}></div>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px', textAlign: 'right' }}>{progressPct.toFixed(1)}% funded</p>
            </>
          )}
          {recentContributors.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={14} color="#9ca3af" />
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Recent: {recentContributors.slice(0, 3).map(c => c.name).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Contribution Form */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>Make a Contribution</h3>
          
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px', marginBottom: '16px', color: '#b91c1c', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleOpenModal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem' }}>Your Name</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#6b7280', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={e => { setIsAnonymous(e.target.checked); if (e.target.checked) setName('') }}
                    style={{ width: '16px', height: '16px', accentColor: '#d32f2f', cursor: 'pointer' }}
                  />
                  Stay Anonymous
                </label>
              </div>
              {isAnonymous ? (
                <div style={{ padding: '12px 16px', border: '1px dashed #d1d5db', borderRadius: '10px', fontSize: '0.9rem', color: '#9ca3af', background: '#f9fafb' }}>
                  🕶️ Your name will appear as <strong>Anonymous</strong>
                </div>
              ) : (
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px' }}>Email <span style={{ color: '#d32f2f' }}>*</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" required
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Quick amount buttons - Hidden for fixed contribution */}
            {!group.is_fixed_contribution && (
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '8px' }}>Amount (GHS)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                  {quickAmounts.map(a => (
                    <button key={a} type="button" onClick={() => setAmount(String(a))}
                      style={{ padding: '10px', border: `2px solid ${amount === String(a) ? '#d32f2f' : '#e5e7eb'}`, borderRadius: '8px', background: amount === String(a) ? '#fef2f2' : 'white', color: amount === String(a) ? '#d32f2f' : '#374151', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}>
                      GHS {a}
                    </button>
                  ))}
                </div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Or enter custom amount"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                {group.min_contribution_amount > 0 && (
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '6px' }}>Minimum: GHS {group.min_contribution_amount}</p>
                )}
              </div>
            )}

            {group.is_fixed_contribution && (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: '600', marginBottom: '4px' }}>FIXED CONTRIBUTION AMOUNT</p>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#d32f2f' }}>GHS {amount}</h1>
                <p style={{ fontSize: '0.75rem', color: '#b91c1c', opacity: 0.8 }}>This group has a set contribution amount for all members.</p>
                <input type="hidden" name="amount" value={amount} />
              </div>
            )}

            <button type="submit"
              style={{ width: '100%', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>
              {`CONTRIBUTE${amount ? ` GHS ${amount}` : ''}`}
            </button>
          </form>
        </div>

        {/* Share Link Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '10px' }}>Share this link</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1, background: '#f4f5f9', borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeof window !== 'undefined' ? window.location.href : `...contribute/${group.invite_code}`}
            </div>
            <button onClick={copyLink} style={{ background: copied ? '#22c55e' : '#1f2937', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', flexShrink: 0 }}>
              {copied ? <><Check size={14} /> Copied!</> : <><Share2 size={14} /> Copy</>}
            </button>
          </div>
        </div>

        {/* Powered by footer */}
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px' }}>
          🔒 Secured by Paystack & MoMo &bull; Powered by StashupSusu
        </p>

      </div>

      <UnifiedPaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amount={Number(amount)}
        userEmail={email}
        groupId={group.id}
        metadata={{ 
          type: 'public_contribution',
          contributorName: isAnonymous ? 'Anonymous' : (name.trim() || 'Anonymous'),
          isAnonymous,
          memo: `Public contribution to ${group.name}`
        }}
      />
    </div>
  )
}
