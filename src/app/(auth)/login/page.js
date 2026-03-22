import { login } from '../actions'
import Link from 'next/link'

export default async function LoginPage({ searchParams }) {
  const params = await searchParams; // next 15 requirement
  return (
    <div className="glass-panel" style={{ maxWidth: '400px', margin: '10vh auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--primary)' }}>Welcome Back</h2>
      
      {params?.error && (
        <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
          {params.error}
        </div>
      )}

      <form action={login} style={{ display: 'flex', flexDirection: 'column' }}>
        <label className="input-label" htmlFor="email">Email</label>
        <input className="input-field" id="email" name="email" type="email" required placeholder="you@example.com" />

        <label className="input-label" htmlFor="password">Password</label>
        <input className="input-field" id="password" name="password" type="password" required placeholder="••••••••" />

        <button className="btn-primary" type="submit" style={{ marginTop: '16px' }}>
          Log In
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: '#94a3b8' }}>
        Don't have an account? <Link href="/register" style={{ color: 'var(--primary)' }}>Sign Up</Link>
      </p>
    </div>
  )
}
