'use client'

import { useState } from 'react'
import { Gift, Copy, Check } from 'lucide-react'

export default function ReferralCard({ userId }) {
  const [copied, setCopied] = useState(false)
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const referralLink = `${siteUrl}/register?ref=${userId?.slice(0, 8)}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
      borderRadius: '20px', padding: '20px', color: 'white',
      display: 'flex', gap: '16px', alignItems: 'center',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ 
        width: '50px', height: '50px', borderRadius: '14px', 
        background: 'rgba(255,255,255,0.1)', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', flexShrink: 0 
      }}>
        <Gift size={28} color="#fbbf24" />
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '4px' }}>Refer & Earn Bonus</h4>
        <p style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: '1.3' }}>
          Invite friends and get a bonus when they complete their first cycle.
        </p>
      </div>
      <button 
        onClick={copyToClipboard}
        style={{ 
          background: copied ? '#16a34a' : 'rgba(255,255,255,0.15)', 
          border: 'none', borderRadius: '10px', padding: '10px', 
          cursor: 'pointer', transition: 'all 0.2s' 
        }}
      >
        {copied ? <Check size={20} color="white" /> : <Copy size={20} color="white" />}
      </button>
    </div>
  )
}
