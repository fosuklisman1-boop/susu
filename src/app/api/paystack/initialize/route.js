import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const planId = formData.get('planId')
    const groupId = formData.get('groupId')
    const amount = formData.get('amount')
    const email = formData.get('email')

    if ((!planId && !groupId) || !amount || !email) {
      return NextResponse.redirect(new URL('/dashboard?error=Missing+payment+details', request.url))
    }

    // Paystack uses kobo (hundredths), so multiply GHS amount by 100
    const amountInKobo = Math.round(Number(amount) * 100)

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency: 'GHS',
        metadata: {
          planId: planId,
          groupId: groupId,
          custom_fields: [
            {
              display_name: planId ? 'Plan ID' : 'Group ID',
              variable_name: planId ? 'plan_id' : 'group_id',
              value: planId || groupId
            }
          ]
        },
        callback_url: `${request.headers.get('origin')}${groupId ? `/dashboard/group-savings/${groupId}` : '/dashboard'}?payment=success`,
      }),
    })

    const data = await response.json()

    if (data.status && data.data.authorization_url) {
      return NextResponse.redirect(data.data.authorization_url)
    } else {
      console.error('Paystack initialization failed:', data)
      return NextResponse.redirect(new URL('/dashboard?error=Payment+initialization+failed', request.url))
    }
  } catch (error) {
    console.error('Error initializing payment:', error)
    return NextResponse.redirect(new URL('/dashboard?error=Internal+server+error', request.url))
  }
}
