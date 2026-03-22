const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function investigate() {
  console.log('--- FORCED SCHEMA INVESTIGATION ---')
  
  // 1. Try to insert a row to see what happens
  const { data, error } = await supabase.from('group_contributions').insert({
    amount: 0,
    status: 'debug_probe',
    reference: 'probe-' + Date.now()
  }).select('*')
  
  if (error) {
    console.error('Insert failed:', error.message)
    // If it mentions a missing column, we know something
  } else {
    console.log('PROBE SUCCESS! Columns found:', Object.keys(data[0]))
    // Clean up
    await supabase.from('group_contributions').delete().eq('id', data[0].id)
  }

  // 2. Try the same for contributions
  const { data: cData, error: cErr } = await supabase.from('contributions').insert({
    amount: 0,
    status: 'debug_probe',
    reference: 'probe-c-' + Date.now()
  }).select('*')
  
  if (cErr) {
    console.error('C Insert failed:', cErr.message)
  } else {
    console.log('C PROBE SUCCESS! Columns found:', Object.keys(cData[0]))
    await supabase.from('contributions').delete().eq('id', cData[0].id)
  }
}

investigate()
