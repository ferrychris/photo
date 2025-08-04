// Direct Stripe to Supabase Sync Service
// This bypasses webhooks and directly syncs subscription data
// Run this as a scheduled job every few minutes

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Price ID to subscription tier mapping
const PRICE_TO_TIER_MAP = {
  'price_1RrOduHF5unOiVE9E5B0zgNA': 'starter',    // $45/month
  'price_1RrOhKHF5unOiVE9rYGrAfAZ': 'pro',        // $99/month  
  'price_1RrOjbHF5unOiVE9BX7kWwy4': 'enterprise', // $499/month
  'price_1RsQUmHF5unOiVE9ZA5CLd3K': 'starter',    // $45/month (new)
};

async function syncSubscriptions() {
  try {
    console.log('🔄 Starting Stripe subscription sync...');
    
    // Get all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
      expand: ['data.customer']
    });
    
    console.log(`📊 Found ${subscriptions.data.length} subscriptions in Stripe`);
    
    for (const subscription of subscriptions.data) {
      await processSubscription(subscription);
    }
    
    console.log('✅ Sync completed successfully');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

async function processSubscription(subscription) {
  try {
    console.log(`🔄 Processing subscription: ${subscription.id}`);
    
    // Get user ID from metadata or customer email
    let userId = subscription.metadata?.supabase_user_id;
    
    if (!userId) {
      // Find user by customer email
      const customer = subscription.customer;
      const customerEmail = typeof customer === 'string' 
        ? (await stripe.customers.retrieve(customer)).email
        : customer.email;
      
      if (!customerEmail) {
        console.log(`⚠️ No email found for subscription ${subscription.id}`);
        return;
      }
      
      // Find user in Supabase
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => u.email === customerEmail);
      
      if (!user) {
        console.log(`⚠️ No user found for email ${customerEmail}`);
        return;
      }
      
      userId = user.id;
    }
    
    console.log(`👤 Processing for user: ${userId}`);
    
    // Determine subscription tier
    const priceId = subscription.items.data[0].price.id;
    const tier = PRICE_TO_TIER_MAP[priceId] || 'starter';
    
    // Update user profile
    await supabase
      .from('profiles')
      .upsert({
        id: userId,
        subscription_tier: tier,
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      });
    
    // Update customer record
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer.id;
    
    const customerEmail = typeof subscription.customer === 'string'
      ? (await stripe.customers.retrieve(subscription.customer)).email
      : subscription.customer.email;
    
    await supabase
      .from('customers')
      .upsert({
        id: userId,
        stripe_customer_id: customerId,
        email: customerEmail,
        updated_at: new Date().toISOString()
      });
    
    // Update subscription record
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        status: subscription.status,
        tier: tier,
        price_id: priceId,
        quantity: subscription.items.data[0].quantity,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      });
    
    // Update subscription features
    const featureMap = {
      starter: { max_photospheres: 5, max_photos: 200, has_video: false, has_priority_support: false, has_white_label: false, has_dedicated_manager: false },
      pro: { max_photospheres: 20, max_photos: 500, has_video: true, has_priority_support: true, has_white_label: false, has_dedicated_manager: false },
      enterprise: { max_photospheres: -1, max_photos: -1, has_video: true, has_priority_support: true, has_white_label: true, has_dedicated_manager: true }
    };
    
    const features = featureMap[tier] || featureMap.starter;
    
    // Get subscription record ID
    const { data: subRecord } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (subRecord) {
      await supabase
        .from('subscription_features')
        .upsert({
          subscription_id: subRecord.id,
          ...features,
          updated_at: new Date().toISOString()
        });
    }
    
    console.log(`✅ Successfully processed subscription ${subscription.id}`);
    
  } catch (error) {
    console.error(`❌ Error processing subscription ${subscription.id}:`, error);
  }
}

// Run sync if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncSubscriptions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { syncSubscriptions };
