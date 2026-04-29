export default function AuthLayout({ children }) {
  return (
    <div className="auth-background">

      {/* Floating orbs — animated via CSS @keyframes float */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div style={{ maxWidth: '400px', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '36px', animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{
            width: '68px', height: '68px',
            background: 'white',
            borderRadius: '20px',
            margin: '0 auto 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.8)'
          }}>
            <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="20" height="20" rx="4" fill="var(--primary)" />
              <path d="M12 16H20M16 12V20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 style={{
            color: 'white', fontSize: '1.9rem', fontWeight: 800,
            letterSpacing: '-0.04em', lineHeight: 1
          }}>
            Pesewa Box
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', marginTop: '8px' }}>
            Smart Savings for Smart People
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
