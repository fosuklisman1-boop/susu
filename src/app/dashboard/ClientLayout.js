'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, MessageCircle, Home, User, Users,
  CreditCard, History, X, BookOpen, Shield, LogOut, ChevronRight, Bell
} from 'lucide-react'
import { ToastProvider } from '@/components/ToastProvider'
import PageTransition from '@/components/PageTransition'
import { getSiteSettings } from '@/app/actions/settings'
import { getUserProfile, getUserWallet } from '@/app/actions/user'
import { getNotifications } from '@/app/actions/notifications'
import {
  slideInLeft, backdropFade, staggerContainer, sidebarLinkItem, badgePop
} from '@/lib/motion'

const NAV_ITEMS = [
  { href: '/dashboard',               icon: Home,    label: 'Home',    exact: true },
  { href: '/dashboard/group-savings', icon: Users,   label: 'Groups'              },
  { href: '/dashboard/history',       icon: History, label: 'History'             },
  { href: '/dashboard/profile',       icon: User,    label: 'Profile'             },
]

const SIDEBAR_LINKS = (settings) => [
  { href: '/dashboard',                                                                                          icon: Home,          label: 'Home',             internal: true  },
  { href: settings?.whatsapp_group_link || `https://wa.me/${settings?.support_phone?.replace(/[+]/g, '')}`,    icon: MessageCircle, label: 'Chat Support',     internal: false },
  { href: '/terms',                                                                                              icon: BookOpen,      label: 'Terms & Conditions', internal: true  },
  { href: '/privacy',                                                                                            icon: Shield,        label: 'Privacy Policy',   internal: true  },
  { href: '/logout',                                                                                             icon: LogOut,        label: 'Logout',           internal: true  },
]

export default function ClientLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [settings, setSettings]       = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [wallet, setWallet]           = useState({ balance: 0 })
  const [notifications, setNotifications] = useState([])
  const pathname = usePathname()

  const unreadCount = notifications?.filter(n => !n.is_read)?.length || 0

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  useEffect(() => {
    async function loadData() {
      const [s, up, w, n] = await Promise.all([
        getSiteSettings(), getUserProfile(), getUserWallet(), getNotifications()
      ])
      if (s)  setSettings(s)
      if (up) setUserProfile(up)
      if (w)  setWallet(w)
      if (n)  setNotifications(n)
    }
    loadData()
  }, [])

  return (
    <ToastProvider>
      <div className="mobile-layout">

        {/* ── Overlay ─────────────────────────────────────── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="offcanvas-overlay"
              variants={backdropFade}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="offcanvas-menu"
              variants={slideInLeft}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Close button */}
              <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.88, rotate: 90 }}
                  transition={{ type: 'spring', damping: 16, stiffness: 400 }}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                    width: 36, height: 36,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={17} />
                </motion.button>
              </div>

              {/* User info */}
              <div className="sidebar-user">
                <div style={{
                  width: 44, height: 44,
                  background: 'white', color: 'var(--primary)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', overflow: 'hidden', flexShrink: 0,
                  fontSize: '1.1rem'
                }}>
                  {userProfile?.avatar_url
                    ? <img src={userProfile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (userProfile?.full_name?.[0] || 'U')}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.2 }}>
                    {userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Susu Saver'}
                  </h3>
                  <p style={{ fontSize: '0.75rem', opacity: 0.72, marginTop: '2px' }}>Ghana</p>
                </div>
              </div>

              {/* Wallet balance */}
              <div style={{
                background: 'rgba(0,0,0,0.16)',
                margin: '0 16px 20px',
                padding: '14px 16px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                  GHS {Number(wallet?.balance || 0).toFixed(2)}
                </h2>
                <p style={{ fontSize: '0.75rem', opacity: 0.78, marginTop: '4px' }}>
                  Wallet Balance{' '}
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    style={{ float: 'right', color: '#fbbf24', fontWeight: 600 }}
                  >
                    + Top up
                  </Link>
                </p>
              </div>

              {/* Nav links — staggered on open */}
              <motion.div
                className="sidebar-links"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {SIDEBAR_LINKS(settings).map((link) => (
                  <motion.div key={link.label} variants={sidebarLinkItem}>
                    <Link
                      href={link.href}
                      target={link.internal ? undefined : '_blank'}
                      onClick={link.internal ? () => setMenuOpen(false) : undefined}
                    >
                      <div className="sidebar-link">
                        <div className="sidebar-link-left">
                          <link.icon size={20} />
                          {link.label}
                        </div>
                        <ChevronRight size={15} opacity={0.4} />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ──────────────────────────────────────── */}
        <header className="mobile-header">
          <motion.button
            className="header-btn"
            whileTap={{ scale: 0.88 }}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </motion.button>

          <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Stashup
          </h2>

          <div style={{ display: 'flex', gap: '6px' }}>
            <Link href="/dashboard/notifications" className="header-btn" style={{ position: 'relative' }}>
              <Bell size={20} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    variants={badgePop}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      background: '#ef4444', color: 'white',
                      fontSize: '0.58rem', fontWeight: 800,
                      minWidth: '15px', height: '15px',
                      borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--primary)', padding: '0 2px'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            <Link
              href={settings?.whatsapp_group_link || `https://wa.me/${settings?.support_phone?.replace(/[+]/g, '')}`}
              target="_blank"
              className="header-btn"
            >
              <MessageCircle size={20} />
            </Link>
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────── */}
        <main className="mobile-content">
          <PageTransition>{children}</PageTransition>
        </main>

        {/* ── Bottom Navigation ────────────────────────────── */}
        <nav className="bottom-nav">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item) ? 'active' : ''}`}
            >
              {isActive(item) && (
                <motion.div
                  layoutId="nav-pill"
                  className="nav-pill"
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                />
              )}
              <item.icon size={22} style={{ position: 'relative', zIndex: 1 }} />
              <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
            </Link>
          ))}

          {/* Central FAB */}
          <Link href="/dashboard" className="fab-container">
            <motion.div
              className="fab-btn"
              whileTap={{ scale: 0.91 }}
              whileHover={{ scale: 1.07 }}
              transition={{ type: 'spring', damping: 18, stiffness: 320 }}
            >
              <CreditCard size={24} />
            </motion.div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '-16px' }}>
              PAY
            </span>
          </Link>

          {NAV_ITEMS.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item) ? 'active' : ''}`}
            >
              {isActive(item) && (
                <motion.div
                  layoutId="nav-pill"
                  className="nav-pill"
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                />
              )}
              <item.icon size={22} style={{ position: 'relative', zIndex: 1 }} />
              <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
            </Link>
          ))}
        </nav>

      </div>
    </ToastProvider>
  )
}
