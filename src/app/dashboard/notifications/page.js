'use client'

import { useState, useEffect } from 'react'
import { getNotifications, markNotificationAsRead } from '@/app/actions/notifications'
import { Bell, CheckCircle2, CreditCard, Users, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadNotifications() {
      const data = await getNotifications()
      setNotifications(data)
      setLoading(false)
      
      // Auto-mark all as read when visiting this page
      if (data.some(n => !n.is_read)) {
        for (const n of data) {
          if (!n.is_read) await markNotificationAsRead(n.id)
        }
      }
    }
    loadNotifications()
  }, [])

  const getTypeIcon = (type) => {
    switch (type) {
      case 'payment': return <CreditCard size={20} color="#16a34a" />
      case 'group': return <Users size={20} color="#2563eb" />
      case 'withdrawal': return <AlertTriangle size={20} color="#d97706" />
      default: return <Bell size={20} color="#6b7280" />
    }
  }

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link href="/dashboard" style={{ color: 'inherit' }}>
          <ArrowLeft size={24} />
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Notifications</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading alerts...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px' }}>
          <Bell size={48} color="#e5e7eb" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>All caught up!</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>You don't have any notifications right now.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((n) => (
            <div 
              key={n.id} 
              style={{ 
                background: 'white', 
                borderRadius: '16px', 
                padding: '16px', 
                display: 'flex', 
                gap: '14px',
                border: n.is_read ? '1px solid transparent' : '1px solid #fee2e2',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
              }}
            >
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '12px', 
                background: '#f9fafb', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {getTypeIcon(n.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>{n.title}</h4>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'prev', month: 'short' })}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.4' }}>{n.message}</p>
                {n.action_link && (
                  <Link 
                    href={n.action_link} 
                    style={{ 
                      display: 'inline-block', marginTop: '8px', 
                      fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary)' 
                    }}
                  >
                    View Details →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
