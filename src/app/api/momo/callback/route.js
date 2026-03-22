import { createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * MTN MoMo Webhook Handler
 * Processes asynchronous notifications for Collections and Disbursements.
 */
export async function POST(req) {
  return await handleMomoCallback(req);
}

export async function PUT(req) {
  return await handleMomoCallback(req);
}

async function handleMomoCallback(req) {
  try {
    const payload = await req.json();
    console.log('--- MoMo Callback Received ---', payload);

    const { 
      referenceId,  // Sometimes provided in custom implementations
      externalId,   // Standard MoMo "externalId" sent in body
      status, 
      reason,
      financialTransactionId 
    } = payload;

    // Use externalId as fallback; MoMo usually sends the reference as externalId
    const lookupRef = referenceId || externalId;

    if (!lookupRef) {
      console.error('❌ Callback failed: No referenceId or externalId found in payload');
      return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
    }

    // IMPORTANT: use Service Role for webhooks to bypass RLS!
    const supabase = await createServiceRoleClient();

    // 1. Determine if this was a Collection or Disbursement
    
    // Check Contributions (Collections)
    const { data: contribution } = await supabase
      .from('contributions')
      .select('id')
      .eq('reference', lookupRef)
      .maybeSingle();

    if (contribution) {
      const dbStatus = status === 'SUCCESSFUL' ? 'success' : (status === 'FAILED' ? 'failed' : 'pending');
      
      const { error: updateErr } = await supabase
        .from('contributions')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', contribution.id);
        
      if (updateErr) console.error('Error updating contribution:', updateErr);
      else console.log(`✅ Updated Contribution ${contribution.id} to ${dbStatus}`);
      
      return NextResponse.json({ success: true });
    }

    // Check Group Contributions
    const { data: groupContrib } = await supabase
      .from('group_contributions')
      .select('id')
      .eq('provider_reference', lookupRef)
      .maybeSingle();

    if (groupContrib) {
      const dbStatus = status === 'SUCCESSFUL' ? 'success' : (status === 'FAILED' ? 'failed' : 'pending');
      
      const { error: updateErr } = await supabase
        .from('group_contributions')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', groupContrib.id);
        
      if (updateErr) console.error('Error updating group contribution:', updateErr);
      else console.log(`✅ Updated Group Contribution ${groupContrib.id} to ${dbStatus}`);
      
      return NextResponse.json({ success: true });
    }

    // Check Withdrawals (Disbursements)
    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('reference', lookupRef)
      .maybeSingle();

    if (withdrawal) {
      const dbStatus = status === 'SUCCESSFUL' ? 'completed' : (status === 'FAILED' ? 'rejected' : 'pending');
      
      const { error: updateErr } = await supabase
        .from('withdrawals')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', withdrawal.id);

      if (updateErr) console.error('Error updating withdrawal:', updateErr);
      else console.log(`✅ Updated Withdrawal ${withdrawal.id} to ${dbStatus}`);
      
      return NextResponse.json({ success: true });
    }

    console.warn(`⚠️ Callback received for unknown reference: ${lookupRef}`);
    return NextResponse.json({ error: 'Reference not found in database' }, { status: 404 });

  } catch (error) {
    console.error('CRITICAL Callback Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
