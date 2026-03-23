'use client'

import { useState } from 'react'
import { PartyPopper, RotateCcw, Trophy, CheckCircle2, Star } from 'lucide-react'
import { restartGroupRotation } from '../actions'

export default function GroupCompletionCeremony({ groupId, isAdmin, rotationIndex }) {
  const [isRestarting, setIsRestarting] = useState(false)

  const handleRestart = async () => {
    if (!confirm('Are you sure you want to start a NEW round/rotation with the same members? This will reset the cycle to 1 but keep everyone in the group.')) return
    
    setIsRestarting(true)
    const result = await restartGroupRotation(groupId)
    if (result.error) {
      alert(result.error)
      setIsRestarting(false)
    }
  }

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', 
      borderRadius: '24px', 
      padding: '48px 24px', 
      textAlign: 'center', 
      color: 'white', 
      marginBottom: '30px', 
      position: 'relative', 
      overflow: 'hidden', 
      boxShadow: '0 20px 50px rgba(30, 27, 75, 0.4)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Decorative Elements */}
      <div style={{ position: 'absolute', top: -10, left: -10, opacity: 0.1 }}><Star size={80} fill="currentColor" /></div>
      <div style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.1 }}><PartyPopper size={80} /></div>
      <div style={{ position: 'absolute', top: '20%', right: '10%', opacity: 0.1 }}><CheckCircle2 size={40} /></div>

      <div style={{ 
        width: '90px', 
        height: '90px', 
        background: '#fbbf24', 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        margin: '0 auto 24px',
        boxShadow: '0 0 30px rgba(251, 191, 36, 0.6)',
        border: '4px solid rgba(255,255,255,0.3)',
        animation: 'pulse 2s infinite'
      }}>
        <Trophy size={48} color="#1e1b4b" />
      </div>

      <h2 style={{ 
        fontSize: '2rem', 
        fontWeight: '900', 
        marginBottom: '12px', 
        letterSpacing: '-0.5px',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}>
        ROTATION COMPLETED!
      </h2>
      
      <p style={{ 
        fontSize: '1.05rem', 
        opacity: 0.9, 
        maxWidth: '320px', 
        margin: '0 auto 32px', 
        lineHeight: '1.6',
        fontWeight: '500'
      }}>
        Congratulations! Round {rotationIndex || 1} has finished and every member has received their payout.
      </p>

      {isAdmin && (
        <button
          onClick={handleRestart}
          disabled={isRestarting}
          style={{ 
            background: 'white', 
            color: '#1e1b4b', 
            border: 'none', 
            borderRadius: '16px', 
            padding: '16px 32px', 
            fontWeight: '800', 
            fontSize: '1.1rem', 
            cursor: isRestarting ? 'not-allowed' : 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            margin: '0 auto',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s ease',
            transform: isRestarting ? 'scale(0.98)' : 'scale(1)',
            opacity: isRestarting ? 0.8 : 1
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {isRestarting ? (
            'Preparing next round...'
          ) : (
            <>
              <RotateCcw size={22} />
              Start Round {(rotationIndex || 1) + 1}
            </>
          )}
        </button>
      )}

      {!isAdmin && (
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Waiting for Admin to restart</span>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(251, 191, 36, 0.7); }
          100% { transform: scale(1); box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
        }
      `}</style>
    </div>
  )
}
