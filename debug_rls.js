const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPolicies() {
  console.log('--- CHECKING POLICIES ON GROUP_CONTRIBUTIONS ---')
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: "SELECT * FROM pg_policies WHERE tablename = 'group_contributions';" 
  }).catch(e => ({ error: e }))

  if (error) {
     console.log('exec_sql failed. Trying metadata query...')
     // Alternative: query a view if available, or just use the earlier assumption.
  } else {
     console.log('Policies found:', JSON.stringify(data, null, 2))
  }
}

checkPolicies()
