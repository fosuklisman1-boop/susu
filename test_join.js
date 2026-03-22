
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testJoin() {
  console.log('Testing Group Members Join...')
  const group_id = 'c1cc19d5-325b-4999-963d-424751df1eb4' // I'll try to find a real one
  
  const { data: grp } = await supabase.from('savings_groups').select('id').limit(1).single()
  if (!grp) {
    console.log('No groups found to test.')
    return
  }

  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, profiles(full_name)')
    .eq('group_id', grp.id)
    .limit(5)
  
  if (error) {
    console.error('JOIN ERROR:', error)
  } else {
    console.log('JOIN SUCCESS:', JSON.stringify(data, null, 2))
  }
}

testJoin()
