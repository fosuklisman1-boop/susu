'use client'

import { useState } from 'react'

export default function PaystackButton({ 
  amount, 
  email, 
  metadata = {}, 
  onSuccess, 
  onClose,
  buttonText = 'Pay Now',
  className = '',
  style = {},
  children
}) {
  const [loading, setLoading] = useState(false)

  const handlePaystack = () => {
    if (typeof window === 'undefined' || !window.PaystackPop) {
      alert('Payment system is still loading. Please try again in a moment.')
      return
    }

    setLoading(true)

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: Math.round(Number(amount) * 100), // convert to kobo
      currency: 'GHS',
      metadata: metadata,
      callback: (response) => {
        setLoading(false)
        if (onSuccess) onSuccess(response)
        else {
          alert('Payment Successful! Reference: ' + response.reference)
          window.location.reload()
        }
      },
      onClose: () => {
        setLoading(false)
        if (onClose) onClose()
      }
    })

    handler.openIframe()
  }

  return (
    <button 
      onClick={handlePaystack} 
      disabled={loading || !amount}
      className={className}
      style={{
        ...style,
        cursor: (loading || !amount) ? 'not-allowed' : 'pointer',
        opacity: (loading || !amount) ? 0.7 : 1
      }}
    >
      {loading ? 'Initializing...' : (children || buttonText)}
    </button>
  )
}
