'use client'

import { useState } from 'react'
import { UserMinus, Loader2 } from 'lucide-react'
import { removeMember } from '../../actions'
import { useToast } from '@/components/ToastProvider'

export default function RemoveMemberButton({ groupId, targetUserId, memberName, hasActivity }) {
  const [isPending, setIsPending] = useState(false)
  const { showToast } = useToast()

  const handleRemove = async () => {
    if (hasActivity) {
      showToast('Cannot remove member who has contributions or payouts.', 'error')
      return
    }

    if (!confirm(`Are you sure you want to remove ${memberName} from this group? This will shift the payout order and cannot be undone.`)) {
      return
    }

    setIsPending(true)
    try {
      const result = await removeMember(groupId, targetUserId)
      if (result.error) {
        showToast(result.error, 'error')
      } else {
        showToast(`${memberName} has been removed.`, 'success')
      }
    } catch (err) {
      showToast('An error occurred while removing the member.', 'error')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button 
      onClick={handleRemove}
      disabled={isPending || hasActivity}
      title={hasActivity ? "Cannot remove member with activity" : "Remove member"}
      style={{ 
        background: hasActivity ? '#f3f4f6' : '#fee2e2', 
        color: hasActivity ? '#9ca3af' : '#b91c1c', 
        border: 'none', 
        borderRadius: '6px', 
        padding: '6px', 
        cursor: (isPending || hasActivity) ? 'not-allowed' : 'pointer', 
        display: 'flex', 
        alignItems: 'center',
        opacity: hasActivity ? 0.6 : 1
      }}
    >
      {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
    </button>
  )
}
