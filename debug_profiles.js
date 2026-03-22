
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
  console.log('Checking profiles table...')
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  
  if (error) {
    console.error('Error selecting from profiles:', error)
  } else {
    console.log('Successfully reached profiles table. Count:', data.length)
  }

  console.log('\nChecking table existence via RPC/Query...')
  const { data: tables, error: tableError } = await supabase.rpc('get_tables').catch(e => ({ error: e }))
  if (tableError) {
    // Fallback to a query that check table names if RPC fails
    const { data: names } = await supabase.from('savings_groups').select('id').limit(1)
    console.log('savings_groups accessible:', !!names)
  }
}

checkSchema()
