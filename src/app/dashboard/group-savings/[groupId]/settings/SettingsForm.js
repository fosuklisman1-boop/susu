'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Info, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { updateGroup } from '@/app/dashboard/group-savings/actions'

export default function SettingsForm({ group }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(updateGroup, null)

  const [name, setName] = useState(group.name)
  const [contributionMode, setContributionMode] = useState(group.is_fixed_contribution ? 'fixed' : 'flexible')
  const [targetAmount, setTargetAmount] = useState(group.target_amount || '')
  const [contributionAmount, setContributionAmount] = useState(group.contribution_amount || '')
  const [minContribution, setMinContribution] = useState(group.min_contribution_amount || '')
  
  // Convert legacy frequency (weekly/monthly) to numeric days for the new input
  const initialFreq = (() => {
    if (!group.frequency) return '7'
    if (!isNaN(Number(group.frequency))) return group.frequency
    if (group.frequency === 'weekly') return '7'
    if (group.frequency === 'biweekly') return '14'
    if (group.frequency === 'monthly') return '30'
    if (group.frequency === 'daily') return '1'
    return '7'
  })()
  const [frequency, setFrequency] = useState(initialFreq)
  const [maxMembers, setMaxMembers] = useState(group.max_members || '')

  const isSuccess = state?.success

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {isSuccess && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbfcce', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#16a34a' }}>
          <CheckCircle size={20} />
          <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>Settings updated successfully!</p>
        </div>
      )}

      {state?.error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#b91c1c' }}>
          <AlertCircle size={20} />
          <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>{state.error}</p>
        </div>
      )}

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <input type="hidden" name="groupId" value={group.id} />
        <input type="hidden" name="is_fixed_contribution" value={contributionMode === 'fixed' ? 'true' : 'false'} />

        {/* Basic Info */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '12px' }}>GROUP NAME</label>
          <input 
            type="text" 
            name="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        {/* Contribution Mode */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '12px' }}>CONTRIBUTION MODE</label>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div 
              onClick={() => setContributionMode('fixed')}
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: contributionMode === 'fixed' ? '2px solid var(--primary)' : '1px solid #e5e7eb', background: contributionMode === 'fixed' ? '#fff5f5' : 'white', textAlign: 'center', cursor: 'pointer' }}
            >
              <p style={{ fontSize: '0.85rem', fontWeight: '700', color: contributionMode === 'fixed' ? 'var(--primary)' : '#6b7280' }}>Fixed</p>
              <p style={{ fontSize: '0.65rem', color: '#9ca3af' }}>Set amount</p>
            </div>
            <div 
              onClick={() => setContributionMode('flexible')}
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: contributionMode === 'flexible' ? '2px solid var(--primary)' : '1px solid #e5e7eb', background: contributionMode === 'flexible' ? '#fff5f5' : 'white', textAlign: 'center', cursor: 'pointer' }}
            >
              <p style={{ fontSize: '0.85rem', fontWeight: '700', color: contributionMode === 'flexible' ? 'var(--primary)' : '#6b7280' }}>Flexible</p>
              <p style={{ fontSize: '0.65rem', color: '#9ca3af' }}>Free range</p>
            </div>
          </div>

          {contributionMode === 'fixed' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px' }}>Amount per contribution (GHS)</label>
              <input 
                type="number" 
                name="contribution_amount" 
                value={contributionAmount} 
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="0.00"
                required={contributionMode === 'fixed'}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1rem', outline: 'none' }}
              />
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px' }}>Minimum contribution (GHS)</label>
              <input 
                type="number" 
                name="min_contribution_amount" 
                value={minContribution} 
                onChange={(e) => setMinContribution(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '8px' }}>
                <Info size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Leave at 0 for no minimum limit.
              </p>
            </div>
          )}
        </div>

        {/* Financial Goals */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '20px' }}>
            {group.group_type === 'contribution' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#6b7280' }}>SET A TARGET GOAL?</label>
                  <input 
                    type="checkbox" 
                    checked={targetAmount !== '0' && targetAmount !== ''} 
                    onChange={e => setTargetAmount(e.target.checked ? '1000' : '0')}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>
                
                {(targetAmount !== '0' && targetAmount !== '') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px' }}>TARGET GOAL (GHS)</label>
                    <input 
                      type="number" 
                      name="target_amount" 
                      value={targetAmount} 
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0.00"
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1rem', outline: 'none' }}
                    />
                  </div>
                )}
                <input type="hidden" name="target_amount" value={targetAmount || '0'} />
              </>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '8px' }}>
                  {group.group_type === 'challenge' ? 'GOAL PER MEMBER (GHS)' : 'TARGET GOAL (GHS)'}
                </label>
                <input 
                  type="number" 
                  name="target_amount" 
                  value={targetAmount} 
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0.00"
                  required={group.group_type === 'challenge'}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1rem', outline: 'none' }}
                />
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '8px' }}>
              {group.group_type === 'rotating' ? 'PAYOUT EVERY (NUMBER OF DAYS)' : 
               group.group_type === 'challenge' ? 'CHALLENGE DURATION (TOTAL DAYS)' : 
               'CONTRIBUTION DURATION (TOTAL DAYS)'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number" 
                name="frequency" 
                value={frequency} 
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="7"
                required
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1rem', outline: 'none' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>Days</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '8px' }}>
              <Info size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              {group.group_type === 'rotating' ? 'Example: 7 for Weekly, 30 for Monthly.' : 'Total number of days this group will be active.'}
            </p>
          </div>

          {group.group_type === 'rotating' && (
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '8px' }}>MAXIMUM MEMBERS (TOTAL PEOPLE)</label>
              <input 
                type="number" 
                name="max_members" 
                value={maxMembers} 
                onChange={(e) => setMaxMembers(e.target.value)}
                placeholder="e.g. 10"
                required
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '8px' }}>
                <Info size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Rotating groups require a fixed member count to calculate payouts.
              </p>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', borderRadius: '14px', border: 'none', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: isPending ? 0.7 : 1 }}
        >
          {isPending ? <Loader2 size={24} className="animate-spin" /> : <><Save size={20} /> Save Changes</>}
        </button>

      </form>
    </div>
  )
}
