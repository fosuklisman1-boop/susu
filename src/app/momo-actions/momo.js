'use server'

import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { getMomoToken, requestToPay, initiateTransfer, getTransactionStatus } from '@/utils/momo';

/**
 * Initiates a MoMo Collection (RequestToPay)
 */
export async function createMomoPayment({ amount, phoneNumber, userId, planId = null, groupId = null, metadata = {} }) {
  // Use Service Role Client to bypass RLS for inserting financial records
  const supabase = await createServiceRoleClient();
  
  // 1. Get Credentials (from .env.local)
  const subscriptionKey = process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY;
  const apiUser = process.env.MOMO_COLLECTION_USER_ID;
  const apiKey = process.env.MOMO_COLLECTION_API_KEY;

  if (!subscriptionKey || !apiUser || !apiKey) {
    throw new Error('MoMo Collection credentials not configured');
  }

  try {
    // 2. Get Token
    const token = await getMomoToken('collection', subscriptionKey, apiUser, apiKey);
    const referenceId = uuidv4();
    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/momo/callback`;

    // 3. Request Payment
    const success = await requestToPay({
      amount: amount.toString(),
      currency: 'EUR', // Sandbox default
      externalId: referenceId,
      payerNumber: phoneNumber,
      payerMessage: metadata.memo || 'Susu Contribution',
      payeeNote: 'Stashup Savings',
      subscriptionKey,
      token,
      referenceId,
      callbackUrl
    });

    if (success) {
      // 4. Log to DB (pending status)
      if (groupId) {
        // Handle Group Contribution
        const { error: insertErr } = await supabase.from('group_contributions').insert({
          user_id: userId,
          group_id: groupId,
          amount,
          status: 'pending',
          provider: 'momo',
          provider_reference: referenceId,
          contributor_name: metadata.contributor_name || metadata.contributorName || 'Member',
          contributor_email: metadata.contributor_email || metadata.contributorEmail || null
        });
        
        if (insertErr) console.error("❌ [MoMo Sync] DB Insert Error for Group Contribution:", insertErr);
      } else {
        // Handle Standard Plan Contribution
        const { error: insertErr } = await supabase.from('contributions').insert({
          user_id: userId,
          plan_id: planId,
          amount,
          status: 'pending',
          provider: 'momo',
          reference: referenceId
        });

        if (insertErr) console.error("❌ [MoMo Sync] DB Insert Error for Standard Contribution:", insertErr);
      }
      
      return { success: true, referenceId };
    }

    return { success: false, error: 'RequestToPay initiation failed' };
  } catch (error) {
    console.error('MoMo Payment Action Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiates a MoMo Disbursement (Withdrawal)
 */
export async function createMomoWithdrawal({ amount, phoneNumber, withdrawalId }) {
  // Use Service Role Client to bypass RLS
  const supabase = await createServiceRoleClient();
  
  const subscriptionKey = process.env.MOMO_DISBURSEMENT_SUBSCRIPTION_KEY;
  const apiUser = process.env.MOMO_DISBURSEMENT_USER_ID;
  const apiKey = process.env.MOMO_DISBURSEMENT_API_KEY;

  if (!subscriptionKey || !apiUser || !apiKey) {
    throw new Error('MoMo Disbursement credentials not configured');
  }

  try {
    const token = await getMomoToken('disbursement', subscriptionKey, apiUser, apiKey);
    const referenceId = uuidv4();
    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/momo/callback`;

    const success = await initiateTransfer({
      amount: amount.toString(),
      currency: 'EUR',
      externalId: referenceId,
      payeeNumber: phoneNumber,
      payerMessage: 'Stashup Withdrawal',
      payeeNote: 'Payout processed via MoMo',
      subscriptionKey,
      token,
      referenceId,
      callbackUrl
    });

    if (success) {
      // Update withdrawal record with reference
      await supabase.from('withdrawals')
        .update({ 
          status: 'pending', 
          reference: referenceId,
          notes: 'MTN MoMo Transfer Initiated'
        })
        .eq('id', withdrawalId);

      return { success: true, referenceId };
    }

    return { success: false, error: 'Disbursement initiation failed' };
  } catch (error) {
    console.error('MoMo Withdrawal Action Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Polls for transaction status and syncs with DB
 */
export async function syncMomoTransaction(type, referenceId) {
  // Use Service Role to bypass RLS for status synchronization and trigger execution
  const supabase = await createServiceRoleClient();
  
  const product = type === 'collection' ? 'COLLECTION' : 'DISBURSEMENT';
  const subscriptionKey = process.env[`MOMO_${product}_SUBSCRIPTION_KEY`];
  const apiUser = process.env[`MOMO_${product}_USER_ID`];
  const apiKey = process.env[`MOMO_${product}_API_KEY`];

  try {
    const token = await getMomoToken(type, subscriptionKey, apiUser, apiKey);
    const status = await getTransactionStatus(type, referenceId, subscriptionKey, token);

    if (!status) return null;

    // Determine DB statuses
    const collectionStatus = status.status === 'SUCCESSFUL' ? 'success' : (status.status === 'FAILED' ? 'failed' : 'pending');
    const withdrawalStatus = status.status === 'SUCCESSFUL' ? 'completed' : (status.status === 'FAILED' ? 'rejected' : 'pending');

    if (type === 'collection') {
       console.log(`🔍 [MoMo Sync] Checking contribution for reference: ${referenceId}`);
       
       // Check standard contributions
       const { data: contrib, error: contribErr } = await supabase.from('contributions')
         .update({ status: collectionStatus, notes: status.reason || null })
         .eq('reference', referenceId)
         .select('id');
       
       if (contribErr) console.error(`❌ [MoMo Sync] DB Update failed for standard contribution:`, contribErr);
       else if (contrib?.length) console.log(`✅ [MoMo Sync] Updated standard contribution ${contrib[0].id}`);
       
       // Check group contributions
       const { data: gContrib, error: gContribErr } = await supabase.from('group_contributions')
         .update({ status: collectionStatus, notes: status.reason || null })
         .eq('provider_reference', referenceId)
         .select('id');

       if (gContribErr) console.error(`❌ [MoMo Sync] DB Update failed for group contribution:`, gContribErr);
       else if (gContrib?.length) console.log(`✅ [MoMo Sync] Updated group contribution ${gContrib[0].id}`);
       
       if (!contrib?.length && !gContrib?.length && !contribErr && !gContribErr) {
         console.warn(`⚠️ [MoMo Sync] No matching contribution found for reference: ${referenceId}`);
       }
    } else {
       console.log(`🔍 [MoMo Sync] Checking withdrawal for reference: ${referenceId}`);
       const { data: wd, error: wdErr } = await supabase.from('withdrawals')
         .update({ status: withdrawalStatus, notes: status.reason || null })
         .eq('reference', referenceId)
         .select('id');
       
       if (wdErr) console.error(`❌ [MoMo Sync] DB Update failed for withdrawal:`, wdErr);
       else if (wd?.length) console.log(`✅ [MoMo Sync] Updated withdrawal ${wd[0].id}`);
       else console.warn(`⚠️ [MoMo Sync] No matching withdrawal found for reference: ${referenceId}`);
    }

    return status;
  } catch (error) {
    console.error('MoMo Sync Error:', error);
    return null;
  }
}
