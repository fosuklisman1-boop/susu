'use client'

import { createGroup } from '../actions'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Copy, Check } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} style={{
      width: '100%', background: '#4ade80', color: 'white', border: 'none',
      borderRadius: '12px', padding: '18px', fontSize: '1.05rem', fontWeight: '700',
      cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1, marginTop: '8px'
    }}>
      {pending ? 'CREATING...' : 'START SAVING'}
    </button>
  )
}

export default function CreateGroupPage() {
  const { showToast } = useToast()
  const router = useRouter()
  const [state, formAction] = useActionState(createGroup, null)
  const [copied, setCopied] = useState(false)
  
  const [fields, setFields] = useState({
    name: '', group_type: '', target_amount: '', contribution_amount: '',
    frequency: '7', max_members: '', payout_method: '', startDate: '', endDate: '',
    is_fixed_contribution: 'true', min_contribution_amount: '0'
  })
  const handle = (e) => setFields(prev => ({ ...prev, [e.target.name]: e.target.value }))

  useEffect(() => {
    if (state?.error) showToast(state.error, 'error')
  }, [state])

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showToast('Invite code copied!', 'success')
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px', border: '1px solid #d1d5db',
    borderRadius: '12px', fontSize: '0.95rem', outline: 'none', background: 'white', color: '#111827'
  }
  const labelStyle = { display: 'block', fontWeight: '700', color: '#111827', marginBottom: '8px', fontSize: '0.9rem' }

  // ── Success State: show invite code ───────────────────────────────────
  if (state?.success) {
    return (
      <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '40px' }}>
        <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Group Created!</h2>
          <Link href="/dashboard/group-savings" style={{ position: 'absolute', right: '24px', background: 'white', color: 'var(--primary)', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </Link>
        </div>
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', textAlign: 'center', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '8px' }}>Group Created!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Share this invite code with your group members</p>
            
            <div style={{ background: '#f4f5f9', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>INVITE CODE</p>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '8px', color: '#111827' }}>{state.inviteCode}</h1>
            </div>

            <button onClick={() => copyCode(state.inviteCode)} style={{ width: '100%', background: copied ? '#22c55e' : '#1f2937', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
              {copied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy Invite Code</>}
            </button>

            <button onClick={() => router.push(`/dashboard/group-savings/${state.groupId}`)} style={{ width: '100%', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer' }}>
              Go to Group →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#f4f5f9', minHeight: '100vh', margin: '-16px', paddingBottom: '40px' }}>
      
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Create A New Group</h2>
        <Link href="/dashboard/group-savings" style={{ position: 'absolute', right: '24px', background: 'white', color: 'var(--primary)', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </Link>
      </div>

      <div style={{ padding: '24px' }}>
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div>
            <label style={labelStyle}>Group Name</label>
            <input type="text" name="name" placeholder="e.g. Friends Vacation Fund"
              value={fields.name} onChange={handle} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Group Savings Type</label>
            <select name="group_type" value={fields.group_type} onChange={handle}
              style={{...inputStyle, WebkitAppearance: 'none', appearance: 'none'}} required>
              <option value="" disabled>Choose A Savings Type</option>
              <option value="rotating">Rotating Group Savings</option>
              <option value="contribution">Contribution Group Savings</option>
              <option value="challenge">Public Group Challenge</option>
            </select>
          </div>

          {/* Rotating — Contribution Amount + Frequency + Start Date + Logo */}
          {fields.group_type === 'rotating' && (
            <>
              <div>
                <label style={labelStyle}>Purpose for this savings</label>
                <input type="text" name="name" placeholder="Saving for Books"
                  value={fields.name} onChange={handle} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Contribution Mode</label>
                <select name="is_fixed_contribution" value={fields.is_fixed_contribution} onChange={handle} style={inputStyle}>
                  <option value="true">Fixed Amount (Members pay set amount)</option>
                </select>
              </div>
              {fields.is_fixed_contribution === 'true' ? (
                <div>
                  <label style={labelStyle}>Amount required per member (GHS)</label>
                  <input type="number" name="contribution_amount" placeholder="100"
                    value={fields.contribution_amount} onChange={handle} style={inputStyle} required />
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Minimum Contribution (GHS) - Use 0 for no limit</label>
                  <input type="number" name="min_contribution_amount" placeholder="5"
                    value={fields.min_contribution_amount} onChange={handle} style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>How do you want to payout</label>
                <select name="payout_method" value={fields.payout_method || ''} onChange={handle}
                  style={{...inputStyle, WebkitAppearance: 'none', appearance: 'none'}}>
                  <option value="" disabled>Choose a payout method</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              {/* Type-Specific Duration/Frequency is handled inside the blocks below */}

              <div>
                <label style={labelStyle}>Payout Every (Number of Days)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" name="frequency" placeholder="7"
                    value={fields.frequency} onChange={handle} style={{...inputStyle, flex: 1}} required />
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>Days</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Maximum Members (Total People)</label>
                <input type="number" name="max_members" placeholder="e.g. 10"
                  value={fields.max_members} onChange={handle} style={inputStyle} required />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                  The payout amount will be (Members × Contribution).
                </p>
              </div>
              <div>
                <input type="date" name="startDate" value={fields.startDate || ''} onChange={handle}
                  placeholder="Choose a start date" style={{...inputStyle, color: fields.startDate ? '#111827' : '#9ca3af'}} />
              </div>
              <div>
                <label style={labelStyle}>Add a group Icon or Logo</label>
                <input type="file" name="group_icon" accept="image/*"
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '12px', fontSize: '0.9rem', background: 'white' }} />
              </div>
            </>
          )}

          {/* Contribution — Purpose, Total Amount, Start/End Date, Logo */}
          {fields.group_type === 'contribution' && (
            <>
              <div>
                <label style={labelStyle}>Purpose for this savings</label>
                <input type="text" name="name" placeholder="Saving for Books"
                  value={fields.name} onChange={handle} style={inputStyle} required />
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={labelStyle}>Contribution Mode</label>
                <select name="is_fixed_contribution" value={fields.is_fixed_contribution} onChange={handle} style={{...inputStyle, marginBottom: '12px'}}>
                  <option value="true">Fixed Amount (Set by you)</option>
                  <option value="false">Flexible (Members choose)</option>
                </select>
                {fields.is_fixed_contribution === 'true' ? (
                  <div>
                    <label style={labelStyle}>Fixed Contribution Amount (GHS)</label>
                    <input type="number" name="contribution_amount" placeholder="50"
                      value={fields.contribution_amount} onChange={handle} style={inputStyle} required />
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Minimum Contribution (GHS)</label>
                    <input type="number" name="min_contribution_amount" placeholder="10"
                      value={fields.min_contribution_amount} onChange={handle} style={inputStyle} />
                  </div>
                )}
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={labelStyle}>Set a target goal for this group?</label>
                  <input 
                    type="checkbox" 
                    checked={fields.target_amount !== '0' && fields.target_amount !== ''} 
                    onChange={e => setFields(prev => ({ ...prev, target_amount: e.target.checked ? '1000' : '0' }))}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>
                
                {(fields.target_amount !== '0' && fields.target_amount !== '') && (
                  <div>
                    <label style={labelStyle}>Total Amount Expected (Goal)</label>
                    <input type="number" name="target_amount" placeholder="1000"
                      value={fields.target_amount} onChange={handle} style={inputStyle} required />
                  </div>
                )}
                <input type="hidden" name="target_amount" value={fields.target_amount || '0'} />
              </div>
              <div>
                <label style={labelStyle}>Contribution Duration (Total Days)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" name="frequency" placeholder="30"
                    value={fields.frequency} onChange={handle} style={{...inputStyle, flex: 1}} required />
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>Days</span>
                </div>
              </div>
              <div>
                <input type="date" name="startDate" value={fields.startDate || ''} onChange={handle}
                  placeholder="Choose a start date" style={{...inputStyle, color: fields.startDate ? '#111827' : '#9ca3af'}} />
              </div>
              <div>
                <input type="date" name="endDate" value={fields.endDate || ''} onChange={handle}
                  placeholder="Choose Ending date" style={{...inputStyle, color: fields.endDate ? '#111827' : '#9ca3af'}} />
              </div>
              <div>
                <label style={labelStyle}>Add a group Icon or Logo</label>
                <input type="file" name="group_icon" accept="image/*"
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '12px', fontSize: '0.9rem', background: 'white' }} />
              </div>
            </>
          )}

          {/* Challenge — Purpose, Goal Per Member, Start/End Date, Logo */}
          {fields.group_type === 'challenge' && (
            <>
              <div>
                <label style={labelStyle}>Purpose for this savings</label>
                <input type="text" name="name" placeholder="Saving for Books"
                  value={fields.name} onChange={handle} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Goal Amount Expected Per Member</label>
                <input type="number" name="target_amount" placeholder="1000"
                  value={fields.target_amount} onChange={handle} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Challenge Duration (Total Days)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" name="frequency" placeholder="30"
                    value={fields.frequency} onChange={handle} style={{...inputStyle, flex: 1}} required />
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>Days</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" name="startDate" value={fields.startDate || ''} onChange={handle}
                  placeholder="Choose a start date" style={{...inputStyle, color: fields.startDate ? '#111827' : '#9ca3af'}} />
              </div>
              <div>
                <label style={labelStyle}>End Date (Optional)</label>
                <input type="date" name="endDate" value={fields.endDate || ''} onChange={handle}
                  placeholder="Choose Ending date" style={{...inputStyle, color: fields.endDate ? '#111827' : '#9ca3af'}} />
              </div>
              <div>
                <label style={labelStyle}>Add a group Icon or Logo</label>
                <input type="file" name="group_icon" accept="image/*"
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '12px', fontSize: '0.9rem', background: 'white' }} />
              </div>
            </>
          )}

          {/* Platform Fee */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>Platform fee</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>This Goal will automatically incur a 5% Charge.</p>
            <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem' }}>
              Apply 5% fee to the goal amount.
            </div>
          </div>

          <SubmitButton />

        </form>
      </div>
    </div>
  )
}
