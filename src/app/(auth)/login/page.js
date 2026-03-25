import { login } from '../actions'
import Link from 'next/link'
import { Mail, Lock, ArrowRight } from 'lucide-react'

export default async function LoginPage({ searchParams }) {
  const params = await searchParams
  
  return (
    <div className="glass-panel">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Welcome Back</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Log in to manage your savings</p>
      
      {params?.error && (
        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', border: '1px solid #fee2e2' }}>
          {params.error}
        </div>
      )}

      <form action={login}>
        <div className="input-group">
          <label className="input-label" htmlFor="email">Email Address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="input-field" id="email" name="email" type="email" required placeholder="you@example.com" style={{ paddingLeft: '40px' }} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="input-field" id="password" name="password" type="password" required placeholder="••••••••" style={{ paddingLeft: '40px' }} />
          </div>
        </div>

        <button className="btn-primary" type="submit" style={{ marginTop: '8px' }}>
          Log In <ArrowRight size={18} />
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Don't have an account? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>Sign Up</Link>
      </p>
    </div>
  )
}
