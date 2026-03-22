const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function inspectTable() {
  console.log('--- INSPECTING group_contributions ---')
  
  // 1. Check columns via a sample row
  const { data: sample, error } = await supabase.from('group_contributions').select('*').limit(1)
  if (error) {
     console.error('Fetch error:', error)
  } else {
     console.log('Sample row columns:', Object.keys(sample[0] || {}))
  }

  // 2. Check for group_id specifically
  const { data: hasCol } = await supabase.from('group_contributions').select('group_id').limit(1).catch(e => ({ error: e }))
  console.log(`Has group_id column? ${hasCol ? 'YES' : 'NO'}`)
}

inspectTable()
