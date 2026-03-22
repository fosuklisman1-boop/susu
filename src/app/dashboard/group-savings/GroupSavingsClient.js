'use client'

import { useState, useRef, useEffect } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Network, Globe, Send, Plus, X, ChevronRight } from 'lucide-react'
import { joinGroup } from './actions'

const TYPE_CONFIG = {
  rotating: {
    label: 'Group Rotating Savings',
    description: 'These are group of individuals who agree to meet for a defined period in order to save and borrow together.',
    icon: Users,
    bg: '#ffebee',
    iconColor: '#d32f2f',
  },
  contribution: {
    label: 'Group Contribution Savings',
    description: 'An ideal way to plan group activities transparently, such as organizing an event, road trips or birthday party, and collectively finance other important life milestones.',
    icon: Network,
    bg: '#e0f2fe',
    iconColor: '#0284c7',
  },
  challenge: {
    label: 'Public Group Savings Challenge',
    description: 'Inspire and motivate each other to reach your goals independently with a group of like-minded friends.',
    icon: Globe,
    bg: '#fef3c7',
    iconColor: '#d97706',
  },
}

export default function GroupSavingsClient({ groups }) {
  const [activeType, setActiveType] = useState(null)
  const listRef = useRef(null)
  const router = useRouter()
  const [joinState, joinAction, joining] = useActionState(joinGroup, null)

  useEffect(() => {
    if (joinState?.success) {
      router.push(`/dashboard/group-savings/${joinState.groupId}`)
    }
  }, [joinState])

  const filteredGroups = activeType
    ? groups.filter(g => g.group_type === activeType)
    : []

  const selectType = (type) => {
    const next = activeType === type ? null : type
    setActiveType(next)
    if (next) {
      setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '120px' }}>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Group Savings</h2>
        <Link href="/dashboard" style={{ position: 'absolute', right: '24px', background: 'white', color: 'var(--primary)', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </Link>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Type Cards */}
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon
          const isActive = activeType === type
          const myGroupsOfType = groups.filter(g => g.group_type === type)
          return (
            <div
              key={type}
              onClick={() => selectType(type)}
              style={{
                background: 'white', borderRadius: '16px', padding: '20px',
                display: 'flex', gap: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                cursor: 'pointer', border: isActive ? '2px solid #d32f2f' : '2px solid transparent',
                transition: 'border 0.2s'
              }}
            >
              <div style={{ width: '64px', height: '64px', background: config.bg, borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: config.iconColor }}>
                <Icon size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ color: '#d32f2f', fontSize: '1rem', marginBottom: '6px' }}>{config.label}</h3>
                  {myGroupsOfType.length > 0 && (
                    <span style={{ background: '#d32f2f', color: 'white', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', marginBottom: '6px' }}>
                      {myGroupsOfType.length}
                    </span>
                  )}
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: '1.4' }}>{config.description}</p>
              </div>
            </div>
          )
        })}

        {/* Filtered Group List */}
        {activeType && (
          <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827' }}>
              {TYPE_CONFIG[activeType].label} ({filteredGroups.length})
            </h3>

            {filteredGroups.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '14px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                You have no {TYPE_CONFIG[activeType].label.toLowerCase()} yet.<br />
                <span style={{ color: '#d32f2f', fontWeight: '600' }}>Create one below ↓</span>
              </div>
            ) : (
              filteredGroups.map(group => (
                <Link key={group.id} href={`/dashboard/group-savings/${group.id}`}>
                  <div style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: TYPE_CONFIG[activeType].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TYPE_CONFIG[activeType].iconColor, fontSize: '1.2rem', fontWeight: '700' }}>
                        {group.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '600' }}>{group.name}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Code: <strong>{group.invite_code}</strong> &bull; {group.member_count || 1} member{(group.member_count || 1) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} color="#9ca3af" />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Join Group Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', marginTop: '8px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>Enter Your Code Below To Join Group</h3>
          {joinState?.error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', color: '#b91c1c', fontSize: '0.85rem' }}>
              ❌ {joinState.error}
            </div>
          )}
          {joinState?.success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', color: '#16a34a', fontSize: '0.85rem' }}>
              ✅ Joined <strong>{joinState.groupName}</strong>! Redirecting...
            </div>
          )}
          <form action={joinAction} style={{ display: 'flex', gap: '12px' }}>
            <input type="text" name="invite_code" placeholder="Enter your group Invitation code" required
              style={{ flex: 1, border: '1px solid #d1d5db', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }} />
            <button type="submit" disabled={joining} style={{ background: joining ? '#9ca3af' : '#1e1b4b', color: 'white', border: 'none', borderRadius: '8px', width: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: joining ? 'not-allowed' : 'pointer' }}>
              <Send size={20} />
            </button>
          </form>
        </div>

      </div>

      {/* Floating Create Button */}
      <div style={{ position: 'fixed', bottom: '100px', left: '0', right: '0', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <Link href="/dashboard/group-savings/create">
          <button style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '30px', padding: '14px 28px', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}>
            <Plus size={18} /> CREATE A GROUP
          </button>
        </Link>
      </div>

    </div>
  )
}
