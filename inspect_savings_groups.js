const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function investigate() {
  console.log('--- SCHEMA INVESTIGATION ---')
  
  // Savings Groups
  const { data: sgData } = await supabase.from('savings_groups').select('*').limit(1)
  if (sgData && sgData.length > 0) {
    console.log('--- SAVINGS GROUPS COLUMNS ---')
    console.log(JSON.stringify(Object.keys(sgData[0]), null, 2))
  }

  // Group Members
  const { data: gmData } = await supabase.from('group_members').select('*').limit(1)
  if (gmData && gmData.length > 0) {
    console.log('--- GROUP MEMBERS COLUMNS ---')
    console.log(JSON.stringify(Object.keys(gmData[0]), null, 2))
  }
}

investigate()
