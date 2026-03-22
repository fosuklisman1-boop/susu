'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, MessageCircle, Home, User, Users, CreditCard, History, X, BookOpen, Shield, LogOut, ChevronRight, Bell } from 'lucide-react'
import { ToastProvider } from '@/components/ToastProvider'
import { getSiteSettings } from '@/app/actions/settings'
import { getUserProfile, getUserWallet } from '@/app/actions/user'
import { getNotifications } from '@/app/actions/notifications'

export default function ClientLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [settings, setSettings] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [wallet, setWallet] = useState({ balance: 0 })
  const [notifications, setNotifications] = useState([])

  const unreadCount = notifications?.filter(n => !n.is_read)?.length || 0

  useEffect(() => {
    async function loadData() {
      const [s, up, w, n] = await Promise.all([
        getSiteSettings(),
        getUserProfile(),
        getUserWallet(),
        getNotifications()
      ])
      if (s) setSettings(s)
      if (up) setUserProfile(up)
      if (w) setWallet(w)
      if (n) setNotifications(n)
    }
    loadData()
  }, [])

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
            <div style={{ width: 40, height: 40, background: 'white', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
              {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (userProfile?.full_name?.[0] || 'U')}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem' }}>{userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Susu Saver'}</h3>
              <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Ghana</p>
            </div>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.1)', margin: '0 16px 16px', padding: '12px 16px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '1.5rem' }}>GHS {Number(wallet?.balance || 0).toFixed(2)}</h2>
            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Wallet Balance <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ float: 'right', color: '#fbbf24', textDecoration: 'none' }}>+ Top up</Link></p>
          </div>

          <div className="sidebar-links">
            <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
              <div className="sidebar-link">
                <div className="sidebar-link-left"><Home size={20}/> Home</div>
                <ChevronRight size={16} opacity={0.5} />
              </div>
            </Link>
            <Link href={settings?.whatsapp_group_link || `https://wa.me/${settings?.support_phone?.replace(/[+]/g, '')}`} target="_blank">
              <div className="sidebar-link">
                <div className="sidebar-link-left"><MessageCircle size={20}/> Chat Support</div>
                <ChevronRight size={16} opacity={0.5} />
              </div>
            </Link>
            <Link href="/terms">
              <div className="sidebar-link">
                <div className="sidebar-link-left"><BookOpen size={20}/> Terms & Conditions</div>
                <ChevronRight size={16} opacity={0.5} />
              </div>
            </Link>
            <Link href="/privacy">
              <div className="sidebar-link">
                <div className="sidebar-link-left"><Shield size={20}/> Privacy Policy</div>
                <ChevronRight size={16} opacity={0.5} />
              </div>
            </Link>
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
          <div style={{ display: 'flex', gap: '4px' }}>
            <Link href="/dashboard/notifications" className="header-btn" style={{ position: 'relative' }}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', top: '6px', right: '6px', 
                  background: '#ef4444', color: 'white', fontSize: '0.6rem', 
                  fontWeight: '800', minWidth: '14px', height: '14px', 
                  borderRadius: '7px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', border: '2px solid var(--primary)',
                  padding: '0 2px'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link href={settings?.whatsapp_group_link || `https://wa.me/${settings?.support_phone?.replace(/[+]/g, '')}`} target="_blank" className="header-btn">
              <MessageCircle size={20} />
            </Link>
          </div>
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
