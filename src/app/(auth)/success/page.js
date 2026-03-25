'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SuccessSplash() {
  const router = useRouter()
  const audioContextRef = useRef(null)

  // Synthesized "Clink" sound using Web Audio API
  const playClink = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1500, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1)
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    } catch (e) {
      console.error('Audio synthesis failed', e)
    }
  }

  useEffect(() => {
    // Play sound 1.2s into the 5s splash (when coin hits)
    const soundTimeout = setTimeout(playClink, 1200)
    
    // Redirect after 5 seconds
    const redirectTimeout = setTimeout(() => {
      router.push('/dashboard')
    }, 5000)

    return () => {
      clearTimeout(soundTimeout)
      clearTimeout(redirectTimeout)
    }
  }, [router])

  return (
    <div className="splash-container">
      {/* Village Background with Blur */}
      <div className="village-bg" style={{ 
        backgroundImage: 'url("/images/village-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(4px) brightness(0.6)',
        position: 'absolute',
        inset: 0,
        zIndex: 0
      }} />

      {/* Atmospheric Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 0%, rgba(69, 10, 10, 0.4) 100%)',
        zIndex: 1
      }} />

      <div className="animation-wrapper" style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: '800', marginBottom: '40px', letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          Savings Success!
        </h2>

        <div className="susu-scene">
          {/* Animated SVG Coin */}
          <svg className="coin" width="60" height="60" viewBox="0 0 60 60" style={{ position: 'absolute', top: '-180px', left: '50%', transform: 'translateX(-50%)' }}>
            <circle cx="30" cy="30" r="28" fill="#ffd700" stroke="#b8860b" strokeWidth="2" />
            <circle cx="30" cy="30" r="24" fill="none" stroke="#b8860b" strokeWidth="1" strokeDasharray="4 4" />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="30" fontWeight="bold" fill="#b8860b">₵</text>
          </svg>

          {/* Susu Box (Traditional Pot) */}
          <svg className="susu-box" width="160" height="120" viewBox="0 0 160 120" style={{ margin: '0 auto' }}>
             {/* Pot body */}
             <path d="M20 100 C 10 120, 150 120, 140 100 L 130 40 C 120 20, 40 20, 30 40 Z" fill="#78350f" stroke="#451a03" strokeWidth="4" />
             {/* Open slit */}
             <rect x="65" y="35" width="30" height="6" rx="3" fill="#451a03" />
             {/* Decorative patterns */}
             <path d="M40 70 Q 80 90 120 70" fill="none" stroke="#a16207" strokeWidth="2" strokeDasharray="5 5" />
             <path d="M45 80 Q 80 100 115 80" fill="none" stroke="#a16207" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: '40px', fontSize: '1.1rem', fontWeight: '500', maxWidth: '300px', margin: '40px auto 0' }}>
           Great job starting your savings journey today!
        </p>
      </div>

      <style jsx>{`
        .splash-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #450a0a;
          position: fixed;
          top: 0; left: 0;
          z-index: 9999;
          animation: fadeIn 1s ease-out forwards;
        }

        .susu-scene {
          position: relative;
          padding-top: 100px;
        }

        .coin {
          animation: coinDrop 1.2s cubic-bezier(0.47, 0, 0.745, 0.715) forwards;
        }

        .susu-box {
          animation: boxWobble 0.3s ease-out 1.2s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes coinDrop {
          0% { transform: translate(-50%, -200px) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          90% { transform: translate(-50%, 65px) rotate(360deg); opacity: 1; }
          100% { transform: translate(-50%, 65px) rotate(360deg); opacity: 0; }
        }

        @keyframes boxWobble {
          0% { transform: rotate(0deg) scale(1.05); }
          25% { transform: rotate(-3deg) scale(1.05); }
          75% { transform: rotate(3deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }
      `}</style>
    </div>
  )
}
