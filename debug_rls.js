const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debug() {
  const { count, error } = await supabase
    .from('group_contributions')
    .select('*', { count: 'exact', head: true })

  console.log('Total Rows in group_contributions:', count)
  
  if (count > 0) {
    const { data } = await supabase.from('group_contributions').select('status, amount').limit(5)
    console.log('Sample Statuses:', data)
  }
}

debug()
