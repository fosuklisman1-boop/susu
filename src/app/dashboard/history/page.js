import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, History } from 'lucide-react'

export default async function HistoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Fetch Standard Plan Contributions
  const { data: standardContribs } = await supabase
    .from('contributions')
    .select('amount, paid_at, status, plan_id, susu_plans(name)')
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })

  // 2. Fetch Group Contributions
  const { data: groupContribs } = await supabase
    .from('group_contributions')
    .select('amount, paid_at, status, group_id, savings_groups(name)')
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })

  // 3. Fetch Withdrawals
  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('amount, created_at, status, payout_method, group_id, savings_groups(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Consolidate into a single list
  const transactions = [
    ...(standardContribs || []).map(c => ({
      id: `std-${c.plan_id}-${c.paid_at}`,
      type: 'contribution',
      category: 'Standard Savings',
      label: c.susu_plans?.name || 'Susu Plan',
      amount: Number(c.amount),
      date: c.paid_at,
      status: c.status
    })),
    ...(groupContribs || []).map(c => ({
      id: `grp-${c.group_id}-${c.paid_at}`,
      type: 'contribution',
      category: 'Group Savings',
      label: c.savings_groups?.name || 'Group Savings',
      amount: Number(c.amount),
      date: c.paid_at,
      status: c.status
    })),
    ...(withdrawals || []).map(w => ({
      id: `wth-${w.created_at}`,
      type: 'withdrawal',
      category: w.group_id ? 'Group Payout' : 'Personal Payout',
      label: w.group_id ? `Withdrawal from ${w.savings_groups?.name}` : `Withdrawal via ${w.payout_method}`,
      amount: Number(w.amount),
      date: w.created_at,
      status: w.status
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const statusColors = {
    success: '#16a34a',
    completed: '#16a34a',
    pending: '#d97706',
    approved: '#2563eb',
    rejected: '#dc2626',
    failed: '#dc2626'
  }

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '100px' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/dashboard" style={{ color: 'white' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Transaction History</h2>
      </div>

      <div style={{ padding: '16px' }}>
        
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px', marginTop: '20px' }}>
            <div style={{ background: '#f3f4f6', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#9ca3af' }}>
              <History size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>No transactions yet</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Your savings journey starts here! Make your first contribution to see it listed.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.map((t) => {
              const isWithdrawal = t.type === 'withdrawal'
              return (
                <div key={t.id} style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ 
                    width: '44px', height: '44px', borderRadius: '12px', 
                    background: isWithdrawal ? '#fef2f2' : '#f0fdf4', 
                    color: isWithdrawal ? '#dc2626' : '#16a34a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    {isWithdrawal ? <ArrowUpRight size={22} /> : <ArrowDownLeft size={22} />}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '2px' }}>{t.label}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.category} &bull; {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: isWithdrawal ? '#111827' : '#16a34a', marginBottom: '4px' }}>
                      {isWithdrawal ? '-' : '+'}GHS {t.amount.toFixed(2)}
                    </p>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase',
                      color: statusColors[t.status] || '#6b7280',
                      background: `${statusColors[t.status]}15` || '#f3f4f6',
                      padding: '2px 8px', borderRadius: '10px'
                    }}>
                      {t.status === 'pending' && <Clock size={10} />}
                      {t.status === 'success' || t.status === 'completed' ? <CheckCircle size={10} /> : null}
                      {t.status === 'failed' || t.status === 'rejected' ? <XCircle size={10} /> : null}
                      {t.status}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
