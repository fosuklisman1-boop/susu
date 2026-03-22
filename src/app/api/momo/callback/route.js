import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * MTN MoMo Webhook Handler
 * Processes asynchronous notifications for Collections and Disbursements.
 */
export async function POST(req) {
  try {
    const payload = await req.json();
    console.log('--- MoMo Callback Received ---', payload);

    const { 
      referenceId, 
      externalId, 
      status, 
      reason,
      financialTransactionId 
    } = payload;

    if (!referenceId) {
      return NextResponse.json({ error: 'Missing referenceId' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Determine if this was a Collection or Disbursement
    // We check BOTH tables for this referenceId
    
    // Check Contributions (Collections)
    const { data: contribution } = await supabase
      .from('contributions')
      .select('id')
      .eq('reference', referenceId)
      .single();

    if (contribution) {
      const dbStatus = status === 'SUCCESSFUL' ? 'success' : (status === 'FAILED' ? 'failed' : 'pending');
      
      await supabase
        .from('contributions')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', contribution.id);
        
      console.log(`Updated Contribution ${contribution.id} to ${dbStatus}`);
      return NextResponse.json({ success: true });
    }

    // Check Group Contributions
    const { data: groupContrib } = await supabase
      .from('group_contributions')
      .select('id')
      .eq('provider_reference', referenceId)
      .single();

    if (groupContrib) {
      const dbStatus = status === 'SUCCESSFUL' ? 'success' : (status === 'FAILED' ? 'failed' : 'pending');
      
      await supabase
        .from('group_contributions')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', groupContrib.id);
        
      console.log(`Updated Group Contribution ${groupContrib.id} to ${dbStatus}`);
      return NextResponse.json({ success: true });
    }

    // Check Withdrawals (Disbursements)
    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('reference', referenceId) // We must store reference in withdrawals too
      .single();

    if (withdrawal) {
      const dbStatus = status === 'SUCCESSFUL' ? 'completed' : (status === 'FAILED' ? 'rejected' : 'pending');
      
      await supabase
        .from('withdrawals')
        .update({ 
          status: dbStatus,
          notes: reason || `MoMo ID: ${financialTransactionId || 'N/A'}`
        })
        .eq('id', withdrawal.id);

      console.log(`Updated Withdrawal ${withdrawal.id} to ${dbStatus}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Reference not found in database' }, { status: 404 });

  } catch (error) {
    console.error('MoMo Callback Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
