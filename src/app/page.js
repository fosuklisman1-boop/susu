import Link from 'next/link';

export default function Home() {
  return (
    <div className="glass-panel" style={{ marginTop: '10vh', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary)' }}>
        Ghana Susu Savings
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '32px', lineHeight: 1.6 }}>
        Welcome to your smart daily savings tracker. Set a goal, make daily contributions, and hit your financial targets effortlessly.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Link href="/login" style={{ width: '100%' }}>
          <button className="btn-primary">Log In to Your Account</button>
        </Link>
        <Link href="/register" style={{ width: '100%' }}>
          <button className="btn-secondary">Create a New Account</button>
        </Link>
      </div>
    </div>
  );
}
