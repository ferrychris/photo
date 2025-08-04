#!/usr/bin/env node

/**
 * Complete Webhook Test Script
 * 
 * This script tests the entire webhook flow by simulating Stripe events
 * and verifying database updates.
 */

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

async function testCompleteWebhookFlow() {
  console.log('🧪 Testing Complete Webhook Flow\n');

  try {
    // Step 1: Create a test customer
    console.log('1️⃣ Creating test customer...');
    const customer = await stripe.customers.create({
      email: 'webhook-test@photosphere.com',
      name: 'Webhook Test User',
      metadata: { test: 'true' }
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
      metadata: { test: 'true' }
    });
    console.log(`✅ Created subscription: ${subscription.id}`);
    console.log(`📊 Status: ${subscription.status}`);
    console.log(`🎯 Price ID: ${subscription.items.data[0].price.id}`);

    // Step 3: Create a checkout session to simulate completion
    console.log('\n3️⃣ Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      subscription: subscription.id,
      mode: 'subscription',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: { test: 'true' }
    });
    console.log(`✅ Created checkout session: ${session.id}`);

    // Step 4: Simulate webhook events
    console.log('\n4️⃣ Webhook Events to Expect:');
    console.log('📡 Your webhook should receive:');
    console.log('   - checkout.session.completed');
    console.log('   - customer.subscription.created');
    console.log('   - invoice.payment_succeeded');
    
    console.log('\n🔍 Expected Database Updates:');
    console.log('   - profiles: subscription_tier = "pro", subscription_status = "trialing"');
    console.log('   - customers: new record with Stripe customer ID');
    console.log('   - subscriptions: complete subscription record');
    console.log('   - subscription_features: pro plan features (20 photospheres, 500 photos, video enabled)');

    // Step 5: Test subscription update
    console.log('\n5️⃣ Testing subscription update...');
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      metadata: { updated: 'true' }
    });
    console.log(`✅ Updated subscription: ${updatedSubscription.id}`);

    return {
      customerId: customer.id,
      subscriptionId: subscription.id,
      sessionId: session.id,
      customerEmail: customer.email
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

async function verifyDatabaseUpdates(customerEmail) {
  console.log('\n🔍 Verifying Database Updates...');
  console.log('Run these SQL queries in your Supabase dashboard:');
  
  console.log('\n-- Check if user profile was updated:');
  console.log(`SELECT p.*, u.email FROM profiles p JOIN auth.users u ON p.id = u.id WHERE u.email = '${customerEmail}';`);
  
  console.log('\n-- Check customer record:');
  console.log(`SELECT * FROM customers WHERE email = '${customerEmail}';`);
  
  console.log('\n-- Check subscription record:');
  console.log(`SELECT s.*, p.subscription_tier FROM subscriptions s JOIN profiles p ON s.user_id = p.id JOIN auth.users u ON p.id = u.id WHERE u.email = '${customerEmail}';`);
  
  console.log('\n-- Check subscription features:');
  console.log(`SELECT sf.* FROM subscription_features sf JOIN subscriptions s ON sf.subscription_id = s.id JOIN profiles p ON s.user_id = p.id JOIN auth.users u ON p.id = u.id WHERE u.email = '${customerEmail}';`);
}

async function cleanupTestData(customerId) {
  try {
    console.log('\n🧹 Cleaning up test data...');
    await stripe.customers.del(customerId);
    console.log('✅ Deleted test customer and associated subscriptions');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Error: STRIPE_SECRET_KEY environment variable is required');
    console.log('Set it with: export STRIPE_SECRET_KEY=sk_test_...');
    process.exit(1);
  }

  try {
    const testData = await testCompleteWebhookFlow();
    
    console.log('\n⏳ Waiting 15 seconds for webhook processing...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    await verifyDatabaseUpdates(testData.customerEmail);
    
    console.log('\n❓ Cleanup test data? (y/n)');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async (key) => {
      const input = key.toString().trim().toLowerCase();
      if (input === 'y') {
        await cleanupTestData(testData.customerId);
        process.exit(0);
      } else if (input === 'n') {
        console.log('🔄 Test data preserved for manual inspection');
        console.log(`Customer ID: ${testData.customerId}`);
        console.log(`Subscription ID: ${testData.subscriptionId}`);
        process.exit(0);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { testCompleteWebhookFlow, verifyDatabaseUpdates, cleanupTestData };