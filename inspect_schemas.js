const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAllNeeded() {
  const table = 'group_contributions'
  const needed = ['id', 'amount', 'status', 'contributor_name', 'contributor_email', 'created_at', 'user_id', 'group_id']
  
  console.log(`Checking ${table}:`)
  for (const col of needed) {
    const { error } = await supabase.from(table).select(col).limit(0)
    if (!error) console.log(`  [OK] ${col}`)
    else console.log(`  [NO] ${col} (${error.message})`)
  }
}

checkAllNeeded()
