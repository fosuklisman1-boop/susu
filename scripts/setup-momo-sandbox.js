require('dotenv').config({ path: '.env.local' });
const { provisionSandboxUser } = require('../src/utils/momo');

/**
 * CLI Script to provision MTN MoMo Sandbox Users and Keys
 */
async function setupSandbox() {
  console.log('🚀 Starting MTN MoMo Sandbox Provisioning...');

  const collectionKey = process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY;
  const disbursementKey = process.env.MOMO_DISBURSEMENT_SUBSCRIPTION_KEY;

  if (!collectionKey || !disbursementKey) {
    console.error('❌ Error: MOMO_COLLECTION_SUBSCRIPTION_KEY or MOMO_DISBURSEMENT_SUBSCRIPTION_KEY is missing in .env.local');
    process.exit(1);
  }

  try {
    console.log('\n--- Provisioning Collection API ---');
    const coll = await provisionSandboxUser(collectionKey);
    console.log('✅ Collection User ID:', coll.userId);
    console.log('✅ Collection API Key:', coll.apiKey);

    console.log('\n--- Provisioning Disbursement API ---');
    const disb = await provisionSandboxUser(disbursementKey);
    console.log('✅ Disbursement User ID:', disb.userId);
    console.log('✅ Disbursement API Key:', disb.apiKey);

    console.log('\n🎉 Setup Complete! Add these values to your .env.local:');
    console.log(`
MOMO_COLLECTION_USER_ID=${coll.userId}
MOMO_COLLECTION_API_KEY=${coll.apiKey}
MOMO_DISBURSEMENT_USER_ID=${disb.userId}
MOMO_DISBURSEMENT_API_KEY=${disb.apiKey}
    `);

  } catch (error) {
    console.error('❌ Provisioning failed:', error.message);
  }
}

setupSandbox();
