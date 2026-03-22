const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testInsert() {
  console.log('--- TEST: Manual Insert into group_contributions ---')
  
  // Get a valid group_id and user_id
  const { data: groups } = await supabase.from('savings_groups').select('id').limit(1)
  const { data: users } = await supabase.from('users').select('id').limit(1)
  
  if (!groups?.length || !users?.length) {
    console.error('Need at least one group and one user to test.')
    return
  }
  
  const groupId = groups[0].id
  const userId = users[0].id
  
  console.log(`Using Group: ${groupId}, User: ${userId}`)

  const { data, error } = await supabase.from('group_contributions').insert({
    group_id: groupId,
    user_id: userId,
    amount: 1.23,
    status: 'success',
    payment_reference: 'TEST_REF_' + Date.now(),
    provider: 'test'
  }).select()

  if (error) {
    console.error('Insert Error:', error)
  } else {
    console.log('Insert Success! Row:', data)
    
    // Immediately check if it's there
    const { data: verify } = await supabase.from('group_contributions').select('*').eq('id', data[0].id)
    console.log('Verification check:', verify?.length > 0 ? 'STILL THERE' : 'VANISHED!')
  }
}

testInsert()
