export default function AuthLayout({ children }) {
  return (
    <div className="auth-background">
      <div style={{ maxWidth: '400px', width: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'white', 
            borderRadius: '18px', 
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
          }}>
             {/* Logo SVG or Icon */}
             <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
               <rect x="6" y="6" width="20" height="20" rx="4" fill="var(--primary)" />
               <path d="M12 16H20M16 12V20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
             </svg>
          </div>
          <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Pesewa Box</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Smart Savings for Smart People</p>
        </div>
        {children}
      </div>
      
      {/* Decorative Blur Orbs */}
      <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'rgba(239, 68, 68, 0.4)', borderRadius: '50%', filter: 'blur(80px)', top: '-10%', left: '-10%' }}></div>
      <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'rgba(127, 29, 29, 0.4)', borderRadius: '50%', filter: 'blur(100px)', bottom: '-15%', right: '-15%' }}></div>
    </div>
  )
}
