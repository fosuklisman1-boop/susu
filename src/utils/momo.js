/**
 * MTN MoMo API Utility
 * Handles authentication, sandbox provisioning, and core requests.
 */

import { v4 as uuidv4 } from 'uuid';

const MOMO_BASE_URL = 'https://sandbox.momodeveloper.mtn.com'; // Change for production

/**
 * Provision an API User and API Key in the Sandbox environment
 * @param {string} subscriptionKey 
 * @param {string} callbackUrlOrHost - The host or full URL where callbacks will be sent
 */
export async function provisionSandboxUser(subscriptionKey, callbackUrlOrHost = 'localhost') {
  const userId = uuidv4();
  
  // Extract hostname if a URL was provided
  let callbackHost = callbackUrlOrHost;
  try {
    if (callbackUrlOrHost.includes('://')) {
      callbackHost = new URL(callbackUrlOrHost).hostname;
    }
  } catch (e) {
    callbackHost = callbackUrlOrHost;
  }
  
  // 1. Create API User
  const userRes = await fetch(`${MOMO_BASE_URL}/v1_0/apiuser`, {
    method: 'POST',
    headers: {
      'X-Reference-Id': userId,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': subscriptionKey
    },
    body: JSON.stringify({ providerCallbackHost: callbackHost })
  });

  if (!userRes.ok) {
    const err = await userRes.text();
    throw new Error(`Failed to create API User: ${err}`);
  }

  // 2. Create API Key
  const keyRes = await fetch(`${MOMO_BASE_URL}/v1_0/apiuser/${userId}/apikey`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!keyRes.ok) {
    throw new Error('Failed to generate API Key');
  }

  const { apiKey } = await keyRes.json();
  return { userId, apiKey };
}

/**
 * Gets a fresh access token for a specific product scope
 * @param {string} productType - 'collection', 'disbursement', etc.
 * @param {string} subscriptionKey - Product-specific subscription key
 * @param {string} apiUser - Provisioned API User UUID
 * @param {string} apiKey - Generated API Key
 */
export async function getMomoToken(productType, subscriptionKey, apiUser, apiKey) {
  const auth = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');
  
  // Endpoint is product-specific: /collection/token/, /disbursement/token/, etc.
  const response = await fetch(`${MOMO_BASE_URL}/${productType}/token/`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MoMo Token Error: ${error}`);
  }

  const data = await response.json();
  return data.access_token; // Valid for 3600 seconds typically
}

/**
 * Initiates a Collection (RequestToPay)
 */
export async function requestToPay({
  amount,
  currency = 'EUR', // Sandbox uses EUR
  externalId,
  payerNumber,
  payerMessage,
  payeeNote,
  subscriptionKey,
  token,
  referenceId, // UUID V4
  callbackUrl
}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Reference-Id': referenceId,
    'X-Target-Environment': 'sandbox',
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': subscriptionKey
  };

  if (callbackUrl) {
    headers['X-Callback-Url'] = callbackUrl;
  }

  const response = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount,
      currency,
      externalId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: payerNumber
      },
      payerMessage,
      payeeNote
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('MTN RequestToPay Failed:', {
      status: response.status,
      body: errBody,
      callbackUrl
    });
    return false;
  }

  return true; // 202 Accepted
}

/**
 * Initiates a Disbursement (Transfer)
 */
export async function initiateTransfer({
  amount,
  currency = 'EUR',
  externalId,
  payeeNumber,
  payerMessage,
  payeeNote,
  subscriptionKey,
  token,
  referenceId,
  callbackUrl
}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Reference-Id': referenceId,
    'X-Target-Environment': 'sandbox',
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': subscriptionKey
  };

  if (callbackUrl) {
    headers['X-Callback-Url'] = callbackUrl;
  }

  const response = await fetch(`${MOMO_BASE_URL}/disbursement/v1_0/transfer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount,
      currency,
      externalId,
      payee: {
        partyIdType: 'MSISDN',
        partyId: payeeNumber
      },
      payerMessage,
      payeeNote
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('MTN Transfer Failed:', {
      status: response.status,
      body: errBody,
      callbackUrl
    });
    return false;
  }

  return true;
}

/**
 * Checks the status of a transaction
 */
export async function getTransactionStatus(type, referenceId, subscriptionKey, token) {
  const endpoint = type === 'collection' ? 'collection/v1_0/requesttopay' : 'disbursement/v1_0/transfer';
  
  const response = await fetch(`${MOMO_BASE_URL}/${endpoint}/${referenceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Target-Environment': 'sandbox',
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!response.ok) return null;
  return await response.json();
}

/**
 * Initiates a Pre-approval request (Consumer Consent)
 */
export async function requestPreApproval({
  externalId,
  payerNumber,
  payerMessage,
  payeeNote,
  subscriptionKey,
  token,
  referenceId
}) {
  const response = await fetch(`${MOMO_BASE_URL}/collection/v1_0/preapproval`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': 'sandbox',
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': subscriptionKey
    },
    body: JSON.stringify({
      externalId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: payerNumber
      },
      payerMessage,
      payeeNote,
      validityPeriod: 2592000 // 30 days
    })
  });

  return response.ok;
}

/**
 * Checks pre-approval status
 */
export async function getPreApprovalStatus(referenceId, subscriptionKey, token) {
  const response = await fetch(`${MOMO_BASE_URL}/collection/v1_0/preapproval/${referenceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Target-Environment': 'sandbox',
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!response.ok) return null;
  return await response.json();
}
