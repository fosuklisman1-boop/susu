'use server'

import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { getMomoToken, requestToPay, initiateTransfer, getTransactionStatus } from '@/utils/momo';

/**
 * Initiates a MoMo Collection (RequestToPay)
 */
export async function createMomoPayment({ amount, phoneNumber, userId, planId = null, groupId = null, metadata = {} }) {
  const supabase = await createClient();
  
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
        await supabase.from('group_contributions').insert({
          user_id: userId,
          group_id: groupId,
          amount,
          status: 'pending',
          provider: 'momo',
          provider_reference: referenceId,
          contributor_name: metadata.contributorName || 'Member',
          is_anonymous: metadata.isAnonymous || false
        });
      } else {
        // Handle Standard Plan Contribution
        await supabase.from('contributions').insert({
          user_id: userId,
          plan_id: planId,
          amount,
          status: 'pending',
          provider: 'momo',
          reference: referenceId
        });
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
  const supabase = await createClient();
  
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
  // Use Service Role to bypass RLS for status synchronization
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

    // Update DB based on status
    if (type === 'collection') {
       // Check standard contributions
       await supabase.from('contributions')
         .update({ status: collectionStatus, notes: status.reason || null })
         .eq('reference', referenceId);
       
       // Check group contributions
       await supabase.from('group_contributions')
         .update({ status: collectionStatus, notes: status.reason || null })
         .eq('provider_reference', referenceId);
    } else {
       await supabase.from('withdrawals')
         .update({ status: withdrawalStatus, notes: status.reason || null })
         .eq('reference', referenceId);
    }

    return status;
  } catch (error) {
    console.error('MoMo Sync Error:', error);
    return null;
  }
}
