import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Simple direct service-role based client for webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // We need this service role key for webhooks
)

export async function POST(request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Validate Paystack Signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    
    // Process successful payment
    if (event.event === 'charge.success') {
      const { reference, amount, metadata, customer } = event.data
      const planId = metadata?.planId
      const groupId = metadata?.groupId

      if (planId) {
        const { data: plan } = await supabase.from('susu_plans').select('user_id').eq('id', planId).single()
        if (plan) {
          const { data: existing } = await supabase.from('contributions').select('id').eq('payment_reference', reference).single()
          if (!existing) {
            await supabase.from('contributions').insert({
              plan_id: planId,
              user_id: plan.user_id,
              amount: (amount / 100).toFixed(2),
              payment_reference: reference,
              status: 'success'
            })
          }
        }
      } else if (groupId) {
        // Find existing user by email from Paystack customer data
        const { data: userData } = await supabase.from('users').select('id').eq('email', customer.email).single()
        
        const { data: existing } = await supabase.from('group_contributions').select('id').eq('payment_reference', reference).single()
        if (!existing) {
          await supabase.from('group_contributions').insert({
            group_id: groupId,
            user_id: userData?.id || null, // Allow null for anonymous public contributions
            amount: (amount / 100).toFixed(2),
            payment_reference: reference,
            status: 'success',
            contributor_name: metadata?.contributor_name || customer.first_name || 'Group Member',
            contributor_email: customer.email
          })
        }
      }
    }

    return NextResponse.json({ status: 'success' })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ message: 'Webhook handler failed' }, { status: 500 })
  }
}
