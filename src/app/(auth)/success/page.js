'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SuccessSplash() {
  const router = useRouter()
  const audioContextRef = useRef(null)

  // Synthesized "Premium Shimmer + Clink" sound
  const playClink = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      const now = ctx.currentTime
      
      // The Shimmer (Higher, softer)
      const shimOsc = ctx.createOscillator()
      const shimGain = ctx.createGain()
      shimOsc.type = 'sine'
      shimOsc.frequency.setValueAtTime(2500, now)
      shimOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.4)
      shimGain.gain.setValueAtTime(0.1, now)
      shimGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
      shimOsc.connect(shimGain)
      shimGain.connect(ctx.destination)
      shimOsc.start(now)
      shimOsc.stop(now + 0.5)

      // The Clink (Sharper)
      const clinkOsc = ctx.createOscillator()
      const clinkGain = ctx.createGain()
      clinkOsc.type = 'triangle'
      clinkOsc.frequency.setValueAtTime(1500, now + 0.05)
      clinkGain.gain.setValueAtTime(0.2, now + 0.05)
      clinkGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      clinkOsc.connect(clinkGain)
      clinkGain.connect(ctx.destination)
      clinkOsc.start(now + 0.05)
      clinkOsc.stop(now + 0.3)
      
    } catch (e) {
      console.error('Audio synthesis failed', e)
    }
  }

  useEffect(() => {
    // Play sound 0.5s into the splash
    const soundTimeout = setTimeout(playClink, 500)
    
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
        filter: 'blur(8px) brightness(0.35)',
        position: 'absolute',
        inset: 0,
        zIndex: 0
      }} />

      {/* Atmospheric Radial Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 0%, rgba(15, 23, 42, 0.9) 100%)',
        zIndex: 1
      }} />

      <div className="animation-wrapper" style={{ position: 'relative', zIndex: 10, textAlign: 'center', width: '100%', maxWidth: '500px', padding: '0 20px' }}>
        <div style={{ marginBottom: '40px', animation: 'fadeInDown 0.8s ease-out' }}>
          <h2 style={{ color: 'white', fontSize: '2.4rem', fontWeight: '900', marginBottom: '8px', letterSpacing: '-0.05em', textShadow: '0 0 30px rgba(251, 191, 36, 0.4)' }}>
            Welcome to the Family!
          </h2>
          <p style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.9 }}>
            Empowering Your Savings Journey
          </p>
        </div>

        <div className="coin-scene">
          <div className="particles">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`particle p${i+1}`} />
            ))}
          </div>

          <div className="modern-coin">
            <svg width="180" height="180" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx="100" cy="100" r="90" fill="rgba(251, 191, 36, 0.1)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="80" fill="url(#goldGradient)" stroke="#fef3c7" strokeWidth="1" filter="url(#glow)" />
              <circle cx="100" cy="100" r="65" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.5" />
              <g stroke="#fef3c7" strokeWidth="0.5" fill="none" opacity="0.6">
                <path d="M100 45 V 55 M100 145 V 155 M45 100 H 55 M145 100 H 155" />
                <circle cx="100" cy="100" r="55" strokeDasharray="10 20" />
                <path d="M70 70 L 80 80 M120 120 L 130 130 M70 130 L 80 120 M130 70 L 120 80" />
              </g>
              <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize="60" fontWeight="900" fill="#451a03">₵</text>
            </svg>
          </div>
        </div>

        {/* Features Showcase */}
        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center', gap: '30px' }}>
          {[
            { label: 'Pesewa Box', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', color: '#10b981' },
            { label: 'Challenges', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', color: '#f59e0b' },
            { label: 'Group Savings', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', color: '#ef4444' }
          ].map((f, i) => (
            <div key={f.label} className="feature-item" style={{ animationDelay: `${1.2 + i * 0.25}s` }}>
              <div style={{ 
                width: '60px', height: '60px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '12px', transition: 'all 0.3s'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <p style={{ color: 'white', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>{f.label}</p>
            </div>
          ))}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '45px', fontSize: '0.85rem', fontWeight: '500', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
           High-tech modular savings for the modern Ghanaian dreamer.
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
          background: #0f172a;
          position: fixed;
          top: 0; left: 0;
          z-index: 9999;
        }

        .coin-scene {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 240px;
        }

        .modern-coin {
          animation: float 4s ease-in-out infinite, rotate3d 10s linear infinite;
          transform-style: preserve-3d;
          perspective: 1000px;
          filter: drop-shadow(0 20px 40px rgba(251, 191, 36, 0.3));
        }

        .feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          transform: translateY(15px);
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .particles {
          position: absolute;
          width: 400px;
          height: 400px;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          background: linear-gradient(90deg, transparent, #fbbf24, transparent);
          height: 1px;
          width: 100px;
          opacity: 0;
          border-radius: 100px;
        }

        .p1 { top: 20%; left: -10%; animation: trail 3s linear infinite; }
        .p2 { top: 50%; left: -20%; animation: trail 4s linear 1s infinite; }
        .p3 { top: 80%; left: -15%; animation: trail 3.5s linear 2s infinite; }
        .p4 { top: 30%; right: -10%; animation: trailReverse 3.2s linear infinite; }
        .p5 { top: 60%; right: -20%; animation: trailReverse 4.5s linear 1.5s infinite; }
        .p6 { top: 90%; right: -15%; animation: trailReverse 3.8s linear 0.5s infinite; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25px); }
        }

        @keyframes rotate3d {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }

        @keyframes fadeInUp {
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes trail {
          0% { transform: translateX(0); opacity: 0; }
          20% { opacity: 0.4; }
          80% { opacity: 0.4; }
          100% { transform: translateX(500px); opacity: 0; }
        }

        @keyframes trailReverse {
          0% { transform: translateX(0); opacity: 0; }
          20% { opacity: 0.4; }
          80% { opacity: 0.4; }
          100% { transform: translateX(-500px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
