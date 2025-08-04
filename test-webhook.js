#!/usr/bin/env node

/**
 * Stripe Webhook Test Script
 * 
 * This script tests the Stripe webhook functionality by creating a test subscription
 * and verifying that the database is updated correctly.
 * 
 * Usage:
 * 1. Make sure your webhook is deployed to Supabase
 * 2. Set your environment variables
 * 3. Run: node test-webhook.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookFlow() {
  console.log('🧪 Testing Stripe Webhook Flow\n');

  try {
    // Step 1: Create a test customer
    console.log('1️⃣ Creating test customer...');
    const customer = await stripe.customers.create({
      email: 'test@photosphere.com',
      name: 'Test User',
      metadata: {
        test: 'true'
      }
    });
    console.log(`✅ Created customer: ${customer.id}`);

    // Step 2: Create a test subscription
    console.log('\n2️⃣ Creating test subscription...');
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: 'price_1RrOhKHF5unOiVE9rYGrAfAZ', // Pro plan
      }],
      trial_period_days: 14,
      metadata: {
        test: 'true'
      }
    });
    console.log(`✅ Created subscription: ${subscription.id}`);
    console.log(`📊 Status: ${subscription.status}`);
    console.log(`🎯 Price ID: ${subscription.items.data[0].price.id}`);

    // Step 3: Simulate checkout completion
    console.log('\n3️⃣ Simulating checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      subscription: subscription.id,
      mode: 'subscription',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });
    console.log(`✅ Created checkout session: ${session.id}`);

    // Step 4: Display webhook information
    console.log('\n4️⃣ Webhook Information:');
    console.log('📡 Your webhook should receive these events:');
    console.log('   - checkout.session.completed');
    console.log('   - customer.subscription.created');
    console.log('   - invoice.payment_succeeded');
    
    console.log('\n🔍 Expected Database Updates:');
    console.log('   - profiles table: subscription_tier = "pro", subscription_status = "trialing"');
    console.log('   - customers table: new record with Stripe customer ID');
    console.log('   - subscriptions table: new subscription record');
    console.log('   - subscription_features table: pro plan features');

    console.log('\n🧹 Cleanup (delete test data):');
    console.log(`   stripe customers delete ${customer.id}`);

    return {
      customerId: customer.id,
      subscriptionId: subscription.id,
      sessionId: session.id
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

async function cleanupTestData(customerId) {
  try {
    console.log('\n🧹 Cleaning up test data...');
    await stripe.customers.del(customerId);
    console.log('✅ Deleted test customer');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Error: STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
  }

  try {
    const testData = await testWebhookFlow();
    
    console.log('\n⏳ Waiting 10 seconds for webhook processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Ask user if they want to cleanup
    console.log('\n❓ Do you want to cleanup the test data? (y/n)');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async (key) => {
      if (key.toString() === 'y') {
        await cleanupTestData(testData.customerId);
        process.exit(0);
      } else if (key.toString() === 'n') {
        console.log('🔄 Test data preserved for manual inspection');
        process.exit(0);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testWebhookFlow, cleanupTestData };