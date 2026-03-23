'use client'

import { useState } from 'react'
import { RotateCcw, AlertCircle } from 'lucide-react'
import { restartGroupRotation } from '../../actions'

export default function RestartRoundButton({ groupId, rotationIndex }) {
  const [isRestarting, setIsRestarting] = useState(false)

  const handleRestart = async () => {
    const nextRound = (rotationIndex || 1) + 1
    if (!confirm(`Are you sure you want to START ROUND ${nextRound}?\n\nThis will reset the current cycle to 1 and change the start date to today. All members remain in the group.`)) return
    
    setIsRestarting(true)
    const result = await restartGroupRotation(groupId)
    if (result.error) {
      alert(result.error)
      setIsRestarting(false)
    } else {
      window.location.reload()
    }
  }

  return (
    <div style={{ 
      marginTop: '32px', 
      padding: '24px', 
      background: 'white', 
      borderRadius: '16px', 
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RotateCcw size={18} /> Restart Group Round
      </h3>
      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '20px', lineHeight: '1.5' }}>
        Finished the current rotation? You can start a fresh round (Round {(rotationIndex || 1) + 1}) with the same members. Previous payment history will be preserved as "Round {rotationIndex || 1}" in the database.
      </p>

      <button
        onClick={handleRestart}
        disabled={isRestarting}
        style={{ 
          width: '100%',
          background: '#1e1b4b', 
          color: 'white', 
          border: 'none', 
          borderRadius: '12px', 
          padding: '14px', 
          fontWeight: '700', 
          fontSize: '0.95rem', 
          cursor: isRestarting ? 'not-allowed' : 'pointer',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '10px',
          opacity: isRestarting ? 0.7 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        <RotateCcw size={18} />
        {isRestarting ? 'Starting New Round...' : `Start Round ${(rotationIndex || 1) + 1}`}
      </button>

      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', background: '#fffbeb', padding: '8px 12px', borderRadius: '8px' }}>
        <AlertCircle size={14} />
        <span style={{ fontSize: '0.7rem', fontWeight: '600' }}>Only use this when the current rotation is complete.</span>
      </div>
    </div>
  )
}
