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

    console.log(`🔍 [MoMo Callback] Processing payload with lookup identifier: ${lookupRef}`);

    if (!lookupRef) {
      console.error('❌ [MoMo Callback] Failed: No referenceId or externalId found in payload');
      return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
    }

    // IMPORTANT: use Service Role for webhooks to bypass RLS!
    const supabase = await createServiceRoleClient();

    // 1. Check Contributions (Standard Plans)
    const { data: contribution, error: contribFetchErr } = await supabase
      .from('contributions')
      .select('id, user_id, status')
      .eq('reference', lookupRef)
      .maybeSingle();

    if (contribFetchErr) console.error('❌ [MoMo Callback] Error fetching contribution:', contribFetchErr);

    if (contribution) {
      const dbStatus = status === 'SUCCESSFUL' ? 'success' : (status === 'FAILED' ? 'failed' : 'pending');
      console.log(`📍 [MoMo Callback] Found Standard Contribution: ${contribution.id}. Updating status ${contribution.status} -> ${dbStatus}`);
      
      const { error: updateErr } = await supabase
        .from('contributions')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', contribution.id);
        
      if (updateErr) console.error('❌ [MoMo Callback] Error updating contribution:', updateErr);
      else console.log(`✅ [MoMo Callback] Successfully updated Standard Contribution ${contribution.id}`);
      
      return NextResponse.json({ success: true });
    }

    // 2. Check Group Contributions
    const { data: groupContrib, error: groupFetchErr } = await supabase
      .from('group_contributions')
      .select('id, user_id, status')
      .eq('provider_reference', lookupRef)
      .maybeSingle();

    if (groupFetchErr) console.error('❌ [MoMo Callback] Error fetching group contribution:', groupFetchErr);

    if (groupContrib) {
      const dbStatus = status === 'SUCCESSFUL' ? 'success' : (status === 'FAILED' ? 'failed' : 'pending');
      console.log(`📍 [MoMo Callback] Found Group Contribution: ${groupContrib.id}. Updating status ${groupContrib.status} -> ${dbStatus}`);
      
      const { error: updateErr } = await supabase
        .from('group_contributions')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', groupContrib.id);
        
      if (updateErr) console.error('❌ [MoMo Callback] Error updating group contribution:', updateErr);
      else console.log(`✅ [MoMo Callback] Successfully updated Group Contribution ${groupContrib.id}`);
      
      return NextResponse.json({ success: true });
    }

    // 3. Check Withdrawals (Disbursements)
    const { data: withdrawal, error: withdrawalFetchErr } = await supabase
      .from('withdrawals')
      .select('id, status')
      .eq('reference', lookupRef)
      .maybeSingle();

    if (withdrawalFetchErr) console.error('❌ [MoMo Callback] Error fetching withdrawal:', withdrawalFetchErr);

    if (withdrawal) {
      const dbStatus = status === 'SUCCESSFUL' ? 'completed' : (status === 'FAILED' ? 'rejected' : 'pending');
      console.log(`📍 [MoMo Callback] Found Withdrawal: ${withdrawal.id}. Updating status ${withdrawal.status} -> ${dbStatus}`);
      
      const { error: updateErr } = await supabase
        .from('withdrawals')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', withdrawal.id);

      if (updateErr) console.error('❌ [MoMo Callback] Error updating withdrawal:', updateErr);
      else console.log(`✅ [MoMo Callback] Successfully updated Withdrawal ${withdrawal.id}`);
      
      return NextResponse.json({ success: true });
    }

    console.warn(`⚠️ [MoMo Callback] Unknown reference received: ${lookupRef}. No matching record in DB.`);
    return NextResponse.json({ error: 'Reference not found in database' }, { status: 404 });

  } catch (error) {
    console.error('CRITICAL Callback Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
