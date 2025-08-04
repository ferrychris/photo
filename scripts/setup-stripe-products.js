#!/usr/bin/env node

/**
 * Stripe Product Setup Script
 * 
 * This script creates the necessary products and prices in Stripe for the PhotoSphere subscription plans.
 * Run this script after setting up your Stripe account and before deploying to production.
 * 
 * Usage:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Set your Stripe secret key: export STRIPE_SECRET_KEY=sk_test_...
 * 3. Run: node scripts/setup-stripe-products.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const plans = [
  {
    id: 'starter',
    name: 'PhotoSphere Starter',
    description: 'Perfect for small events - 5 PhotoSpheres, Virtual PhotoBooth, Basic moderation tools, Up to 200 photos displayed',
    price: 4500, // $45.00 in cents
    features: [
      '5 PhotoSpheres included',
      'Virtual PhotoBooth',
      'Basic moderation tools',
      'Up to 200 photos displayed',
      '14-day free trial'
    ]
  },
  {
    id: 'pro',
    name: 'PhotoSphere Pro',
    description: 'Best for growing businesses - 20 PhotoSpheres, Advanced camera animations, Built-in video recording, Up to 500 photos displayed, Priority support',
    price: 9900, // $99.00 in cents
    popular: true,
    features: [
      '20 PhotoSpheres',
      'Advanced camera animations',
      'Built-in video recording',
      'Up to 500 photos',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'PhotoSphere Enterprise',
    description: 'For large organizations - Unlimited PhotoSpheres, White label, Dedicated Account Manager, Custom training, 24/7 premium support',
    price: 49900, // $499.00 in cents
    features: [
      'Unlimited PhotoSpheres',
      'White label on your domain',
      'Dedicated Account Manager',
      'Custom training sessions',
      '24/7 premium support'
    ]
  }
];

async function createProducts() {
  console.log('🚀 Setting up Stripe products and prices...\n');

  const results = [];

  for (const plan of plans) {
    try {
      console.log(`📦 Creating product: ${plan.name}`);
      
      // Create product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          plan_id: plan.id,
          features: JSON.stringify(plan.features),
          popular: plan.popular ? 'true' : 'false'
        }
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create monthly recurring price
      console.log(`💰 Creating monthly price for ${plan.name}`);
      
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan_id: plan.id
        }
      });

      console.log(`✅ Price created: ${price.id}`);

      results.push({
        planId: plan.id,
        productId: product.id,
        priceId: price.id,
        name: plan.name,
        amount: plan.price
      });

      console.log(''); // Empty line for readability
    } catch (error) {
      console.error(`❌ Error creating ${plan.name}:`, error.message);
    }
  }

  return results;
}

async function displayResults(results) {
  console.log('🎉 Setup complete! Here are your product and price IDs:\n');
  
  console.log('📋 Copy these IDs to your subscriptionStore.ts file:\n');
  
  console.log('export const PLAN_CONFIGS = {');
  
  results.forEach((result, index) => {
    const comma = index < results.length - 1 ? ',' : '';
    console.log(`  ${result.planId}: {`);
    console.log(`    id: '${result.planId}',`);
    console.log(`    name: '${result.name}',`);
    console.log(`    price: ${result.amount / 100},`);
    console.log(`    interval: 'month' as const,`);
    console.log(`    priceId: '${result.priceId}',`);
    console.log(`    isPopular: ${result.planId === 'pro'},`);
    console.log(`    features: [/* your features */]`);
    console.log(`  }${comma}`);
  });
  
  console.log('} as const;\n');

  console.log('🔗 Stripe Dashboard Links:');
  results.forEach(result => {
    console.log(`${result.name}: https://dashboard.stripe.com/products/${result.productId}`);
  });

  console.log('\n📝 Next Steps:');
  console.log('1. Update the PLAN_CONFIGS in src/store/subscriptionStore.ts with the price IDs above');
  console.log('2. Set up your webhook endpoint in Stripe Dashboard');
  console.log('3. Configure the webhook to send events to your Supabase Edge Function');
  console.log('4. Test the subscription flow in your application');
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Error: STRIPE_SECRET_KEY environment variable is required');
    console.log('Set it with: export STRIPE_SECRET_KEY=sk_test_...');
    process.exit(1);
  }

  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    console.error('❌ Error: Invalid Stripe secret key format');
    process.exit(1);
  }

  const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  console.log(`🔧 Running in ${isTestMode ? 'TEST' : 'LIVE'} mode\n`);

  if (!isTestMode) {
    console.log('⚠️  WARNING: You are running in LIVE mode!');
    console.log('This will create real products and prices in your Stripe account.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    const results = await createProducts();
    await displayResults(results);
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createProducts, displayResults };
