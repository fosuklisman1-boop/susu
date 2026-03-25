import { signup } from '../actions'
import Link from 'next/link'
import { User, Mail, Lock, Phone, ArrowRight } from 'lucide-react'

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams
  
  return (
    <div className="glass-panel">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Create Account</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Join the Pesewa Box community today</p>
      
      {params?.error && (
        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', border: '1px solid #fee2e2' }}>
          {params.error}
        </div>
      )}

      <form action={signup}>
        <div className="input-group">
          <label className="input-label" htmlFor="full_name">Full Name</label>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="input-field" id="full_name" name="full_name" type="text" required placeholder="John Doe" style={{ paddingLeft: '40px' }} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="phone_number">Phone Number</label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="input-field" id="phone_number" name="phone_number" type="tel" required placeholder="024 XXX XXXX" style={{ paddingLeft: '40px' }} />
          </div>
        </div>

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
          Create Account <ArrowRight size={18} />
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Log In</Link>
      </p>
    </div>
  )
}
