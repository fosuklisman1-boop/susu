import { signup } from '../actions'
import Link from 'next/link'

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  return (
    <div className="glass-panel" style={{ maxWidth: '400px', margin: '10vh auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--primary)' }}>Create an Account</h2>
      
      {params?.error && (
        <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
          {params.error}
        </div>
      )}

      <form action={signup} style={{ display: 'flex', flexDirection: 'column' }}>
        <label className="input-label" htmlFor="full_name">Full Name</label>
        <input className="input-field" id="full_name" name="full_name" type="text" required placeholder="John Doe" style={{ marginBottom: '12px' }} />

        <label className="input-label" htmlFor="phone_number">Phone Number</label>
        <input className="input-field" id="phone_number" name="phone_number" type="tel" required placeholder="024 XXX XXXX" style={{ marginBottom: '12px' }} />

        <label className="input-label" htmlFor="email">Email</label>
        <input className="input-field" id="email" name="email" type="email" required placeholder="you@example.com" style={{ marginBottom: '12px' }} />

        <label className="input-label" htmlFor="password">Password</label>
        <input className="input-field" id="password" name="password" type="password" required placeholder="••••••••" />

        <button className="btn-primary" type="submit" style={{ marginTop: '16px' }}>
          Sign Up
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: '#94a3b8' }}>
        Already have an account? <Link href="/login" style={{ color: 'var(--primary)' }}>Log In</Link>
      </p>
    </div>
  )
}
