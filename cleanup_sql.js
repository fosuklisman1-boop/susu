const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanup() {
  console.log('--- CLEANING UP RLS FUNCTIONS ---')
  
  const queries = [
    'DROP FUNCTION IF EXISTS public.check_is_group_member(uuid, uuid) CASCADE;',
    'DROP FUNCTION IF EXISTS public.check_is_group_member(gid uuid, uid uuid) CASCADE;',
    'DROP FUNCTION IF EXISTS public.check_is_group_member(p_group_id uuid, p_user_id uuid) CASCADE;'
  ]

  for (const q of queries) {
    console.log(`Executing: ${q}`)
    const { error } = await supabase.rpc('exec_sql', { sql_query: q }).catch(e => ({ error: e }))
    if (error) {
       console.log(`Note: Query failed or exec_sql not available. This is expected if the function is already gone or locked.`)
    }
  }
}

// Note: If exec_sql is not available, I'll just generate the pure SQL for the user.
cleanup()
