import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="auth-background">
      <div style={{ maxWidth: '440px', width: '100%', position: 'relative', zIndex: 1 }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ 
            width: '72px', 
            height: '72px', 
            background: 'var(--primary-gradient)', 
            borderRadius: '20px', 
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(198, 40, 40, 0.2)'
          }}>
             <Sparkles size={36} color="white" />
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '12px', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            Pesewa Box
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Welcome to your smart daily savings tracker. Set a goal, make daily contributions, and hit your financial targets effortlessly.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href="/login" style={{ width: '100%' }}>
              <button className="btn-primary">
                Log In to Your Account <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/register" style={{ width: '100%' }}>
              <button className="btn-secondary">
                Create a New Account
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Blur Orbs */}
      <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'rgba(239, 68, 68, 0.3)', borderRadius: '50%', filter: 'blur(80px)', top: '-10%', left: '-10%' }}></div>
      <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'rgba(127, 29, 29, 0.3)', borderRadius: '50%', filter: 'blur(100px)', bottom: '-15%', right: '-15%' }}></div>
    </div>
  )
}
