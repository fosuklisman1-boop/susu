'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PlusCircle, Target, Users, CheckCircle, ChevronRight, Lock } from 'lucide-react'
import UnifiedPaymentModal from '@/components/UnifiedPaymentModal'
import ReferralCard from '@/components/ReferralCard'
import { staggerContainer, staggerItem } from '@/lib/motion'

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    const start = Date.now()
    let raf
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      setValue(target * (1 - Math.pow(1 - t, 3))) // easeOutCubic
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

export default function DashboardClient({
  user, activePlans, planSavings, availableBalance, lockedBalance = 0
}) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false)
  const animatedBalance = useCountUp(availableBalance)
  const animatedLocked  = useCountUp(lockedBalance)

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >

      {/* ── Balance Card ─────────────────────────────────── */}
      <motion.div variants={staggerItem} className="main-balance-card">
        <div className="balance-card-header">
          <div className="balance-avatar">
            <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              {user.email?.split('@')[0]}
            </h3>
            <p style={{ fontSize: '0.75rem', opacity: 0.82 }}>
              Ghana &bull; ID: {user.id.slice(0, 6)}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.18)', padding: '7px', borderRadius: '10px' }}>
            <Target size={18} />
          </div>
        </div>

        <div className="balance-amounts">
          <div>
            <p style={{ fontSize: '0.75rem', opacity: 0.88, marginBottom: '4px' }}>
              Available Balance
            </p>
            <h1 style={{ fontSize: '2.3rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1 }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 600, marginRight: '4px' }}>GHS</span>
              {animatedBalance.toFixed(2)}
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', opacity: 0.78, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              Locked <Lock size={10} />
            </p>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, opacity: 0.9 }}>
              GHS {animatedLocked.toFixed(2)}
            </h1>
          </div>
        </div>

        <div className="balance-actions" style={{ marginTop: '14px', gap: '12px' }}>
          <Link href="/dashboard/withdraw" style={{ flex: 1, textDecoration: 'none' }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: 'white', color: 'var(--primary)',
                padding: '12px', borderRadius: '10px',
                fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                letterSpacing: '-0.01em'
              }}
            >
              Withdraw
            </motion.button>
          </Link>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsTopUpOpen(true)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.18)', color: 'white',
              padding: '12px', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '10px',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', letterSpacing: '-0.01em'
            }}
          >
            Top Up
          </motion.button>
        </div>
      </motion.div>

      <UnifiedPaymentModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        amount={50}
        userEmail={user.email}
        userId={user.id}
        metadata={{ type: 'top_up', memo: 'Personal Account Top-up' }}
      />

      {/* ── Quick Actions ────────────────────────────────── */}
      <motion.div variants={staggerItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Link href="/dashboard/group-savings" style={{ textDecoration: 'none' }}>
          <motion.div
            className="sub-card"
            whileTap={{ scale: 0.96 }}
            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '18px', margin: 0, height: '100%', cursor: 'pointer' }}
          >
            <div className="card-icon-box" style={{ background: '#fef2f2', color: '#d32f2f' }}>
              <Users size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Group Savings</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                Save together with friends
              </p>
            </div>
          </motion.div>
        </Link>

        <Link href="/dashboard/pesewa-challenge" style={{ textDecoration: 'none' }}>
          <motion.div
            className="sub-card"
            whileTap={{ scale: 0.96 }}
            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '18px', margin: 0, height: '100%', cursor: 'pointer' }}
          >
            <div className="card-icon-box" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Target size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Challenges</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                Reach your goals faster
              </p>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* ── Referral ─────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <ReferralCard userId={user.id} />
      </motion.div>

      {/* ── Savings Plans ────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>My Savings Plans</h3>
          <Link
            href="/dashboard/create-plan"
            style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            <PlusCircle size={15} /> New Plan
          </Link>
        </div>

        {activePlans?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activePlans.map((plan, i) => {
              const saved    = planSavings[plan.id] || 0
              const progress = Math.min((saved / Number(plan.target_amount)) * 100, 100)
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 + 0.15, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href={`/dashboard/pesewa-box/${plan.id}`} style={{ textDecoration: 'none' }}>
                    <div className="sub-card" style={{ padding: '16px', cursor: 'pointer', margin: 0, position: 'relative' }}>
                      {progress < 100 && (
                        <div style={{
                          position: 'absolute', top: '12px', right: '12px',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: '#fef2f2', color: '#ef4444',
                          padding: '2px 8px', borderRadius: '12px',
                          fontSize: '0.65rem', fontWeight: 'bold'
                        }}>
                          <Lock size={10} /> Locked
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                        <div
                          className="card-icon-box"
                          style={{
                            background: progress >= 100 ? '#f0fdf4' : '#f3f4f6',
                            color: progress >= 100 ? '#16a34a' : '#9ca3af',
                            width: '44px', height: '44px'
                          }}
                        >
                          {progress >= 100 ? <CheckCircle size={22} /> : <Lock size={20} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                              {plan.name || 'Savings Plan'}
                            </h4>
                            <span style={{
                              fontSize: '0.85rem', fontWeight: 700,
                              color: progress >= 100 ? '#16a34a' : 'var(--primary)'
                            }}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>

                          {/* Animated progress bar */}
                          <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', marginBottom: '8px', overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ delay: i * 0.07 + 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                              style={{
                                background: progress >= 100 ? '#16a34a' : 'var(--primary)',
                                height: '100%', borderRadius: '3px'
                              }}
                            />
                          </div>

                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            GHS {saved.toFixed(2)} saved <span style={{ opacity: 0.45 }}>&bull;</span> Target GHS {Number(plan.target_amount).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <Link href="/dashboard/create-plan" style={{ textDecoration: 'none' }}>
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                border: '2px dashed #e5e7eb', borderRadius: '16px',
                padding: '32px 20px', textAlign: 'center', cursor: 'pointer'
              }}
            >
              <div style={{
                background: '#fef2f2', color: 'var(--primary)',
                width: '50px', height: '50px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px'
              }}>
                <PlusCircle size={24} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>No Active Plans</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Launch your first savings plan now!</p>
            </motion.div>
          </Link>
        )}
      </motion.div>

      {/* ── Security Bar ─────────────────────────────────── */}
      <motion.div
        variants={staggerItem}
        style={{
          background: 'white', borderRadius: '16px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px',
          boxShadow: 'var(--shadow-flat)',
          border: '1px solid rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '10px' }}>
          <Lock size={18} color="var(--text-muted)" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>Security Center</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Your savings are backed by Ghana Banks
          </p>
        </div>
        <ChevronRight size={18} color="#9ca3af" />
      </motion.div>

    </motion.div>
  )
}
