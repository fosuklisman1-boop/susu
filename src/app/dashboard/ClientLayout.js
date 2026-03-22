'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, MessageCircle, Home, User, Users, CreditCard, History, X, BookOpen, Shield, LogOut, ChevronRight } from 'lucide-react'
import { ToastProvider } from '@/components/ToastProvider'

export default function ClientLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="mobile-layout">
        
        {/* Off-canvas Overlay */}
        <div 
          className={`offcanvas-overlay ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Off-canvas Sidebar Menu */}
        <div className={`offcanvas-menu ${menuOpen ? 'open' : ''}`}>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <X onClick={() => setMenuOpen(false)} style={{ cursor: 'pointer' }} />
          </div>
          
          <div className="sidebar-user">
            <div style={{ width: 40, height: 40, background: 'white', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              U
            </div>
            <div>
              <h3 style={{ fontSize: '1rem' }}>Susu Saver</h3>
              <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Ghana</p>
            </div>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.1)', margin: '0 16px 16px', padding: '12px 16px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '1.5rem' }}>GHS 0.00</h2>
            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Wallet Balance <span style={{ float: 'right', color: '#fbbf24' }}>+ Top up</span></p>
          </div>

          <div className="sidebar-links">
            <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
              <div className="sidebar-link">
                <div className="sidebar-link-left"><Home size={20}/> Home</div>
                <ChevronRight size={16} opacity={0.5} />
              </div>
            </Link>
            <div className="sidebar-link">
              <div className="sidebar-link-left"><MessageCircle size={20}/> Chat Support</div>
              <ChevronRight size={16} opacity={0.5} />
            </div>
            <div className="sidebar-link">
              <div className="sidebar-link-left"><BookOpen size={20}/> Terms & Conditions</div>
              <ChevronRight size={16} opacity={0.5} />
            </div>
            <div className="sidebar-link">
              <div className="sidebar-link-left"><Shield size={20}/> Privacy Policy</div>
              <ChevronRight size={16} opacity={0.5} />
            </div>
            <Link href="/logout">
              <div className="sidebar-link">
                <div className="sidebar-link-left"><LogOut size={20}/> Logout</div>
                <ChevronRight size={16} opacity={0.5} />
              </div>
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="mobile-header">
          <button className="header-btn" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Stashup
          </h2>
          <button className="header-btn">
            <MessageCircle size={20} />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="mobile-content">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          <Link href="/dashboard" className="nav-item">
            <Home size={22} />
            <span>Home</span>
          </Link>
          <Link href="/dashboard/group-savings" className="nav-item">
            <Users size={22} />
            <span>Groups</span>
          </Link>
          
          {/* Central Quick Pay FAB */}
          <Link href="/dashboard" className="fab-container">
            <div className="fab-btn">
              <CreditCard size={24} />
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '-20px' }}>PAY</span>
          </Link>
          
          <Link href="/dashboard/history" className="nav-item">
            <History size={22} />
            <span>History</span>
          </Link>
          <div className="nav-item">
            <User size={22} />
            <span>Profile</span>
          </div>
        </nav>

      </div>
    </ToastProvider>
  )
}
