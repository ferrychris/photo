import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient()
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  }
});

// Updated price ID to subscription tier mapping
const PRICE_TO_TIER_MAP: Record<string, string> = {
  // Monthly recurring prices
  'price_1RrOduHF5unOiVE9E5B0zgNA': 'starter',    // $45/month
  'price_1RrOhKHF5unOiVE9rYGrAfAZ': 'pro',        // $99/month  
  'price_1RrOjbHF5unOiVE9BX7kWwy4': 'enterprise', // $499/month
  // Dynamically created prices (fallback)
  'price_starter_monthly': 'starter',
  'price_pro_monthly': 'pro',
  'price_enterprise_monthly': 'enterprise'
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature, Authorization'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ No Stripe signature provided');
      return new Response('No signature provided', {
        status: 400,
        headers: corsHeaders
      });
    }

    const body = await req.text();
    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed:`, err.message);
      return new Response(`Webhook signature verification failed: ${err.message}`, {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log(`✅ Received verified event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    console.error('❌ Webhook processing error:', err);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
      headers: corsHeaders
    });
  }
});

async function handleCheckoutSessionCompleted(session: any) {
  try {
    console.log('🔄 Processing checkout.session.completed:', session.id);
    
    // Get customer email from the session
    const customerEmail = session.customer_details?.email || session.customer_email;
    if (!customerEmail) {
      throw new Error('No customer email found in session');
    }
    console.log('📧 Customer email:', customerEmail);

    // Get subscription details
    const subscriptionId = session.subscription;
    if (!subscriptionId) {
      console.log('⚠️ No subscription ID found - this might be a one-time payment');
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('💳 Retrieved subscription:', subscription.id);

    // Determine the subscription tier based on the price ID
    const priceId = subscription.items.data[0].price.id;
    const subscriptionTier = PRICE_TO_TIER_MAP[priceId] || 'starter';
    console.log('🎯 Price ID:', priceId, '-> Tier:', subscriptionTier);

    // Find the user by email
    const user = await findUserByEmail(customerEmail);
    if (!user) {
      throw new Error(`User not found for email ${customerEmail}`);
    }
    console.log('👤 Found user:', user.id);

    // Ensure profile exists
    await ensureProfileExists(user.id, customerEmail);

    // Update all tables in sequence
    await updateProfileSubscription(user.id, subscriptionTier, subscription.status);
    await createOrUpdateCustomer(user.id, subscription.customer, customerEmail);
    await createOrUpdateSubscription(user.id, subscription, subscriptionTier);
    
    console.log(`✅ Successfully processed checkout for user ${user.id} with tier ${subscriptionTier}`);

  } catch (error) {
    console.error('❌ Error handling checkout.session.completed:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    console.log('🔄 Processing customer.subscription.updated:', subscription.id);
    
    // Get customer email from Stripe
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customerEmail = customer.email;
    if (!customerEmail) {
      throw new Error('No customer email found');
    }
    console.log('📧 Customer email:', customerEmail);

    // Determine the subscription tier based on the price ID
    const priceId = subscription.items.data[0].price.id;
    const subscriptionTier = PRICE_TO_TIER_MAP[priceId] || 'starter';
    console.log('🎯 Price ID:', priceId, '-> Tier:', subscriptionTier);

    // Find the user by email
    const user = await findUserByEmail(customerEmail);
    if (!user) {
      throw new Error(`User not found for email ${customerEmail}`);
    }
    console.log('👤 Found user:', user.id);

    // Update all tables
    await updateProfileSubscription(user.id, subscriptionTier, subscription.status);
    await createOrUpdateCustomer(user.id, subscription.customer, customerEmail);
    await createOrUpdateSubscription(user.id, subscription, subscriptionTier);

    console.log(`✅ Successfully updated subscription for user ${user.id}`);

  } catch (error) {
    console.error('❌ Error handling customer.subscription.updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    console.log('🔄 Processing customer.subscription.deleted:', subscription.id);
    
    // Get customer email from Stripe
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customerEmail = customer.email;
    if (!customerEmail) {
      throw new Error('No customer email found');
    }
    console.log('📧 Customer email:', customerEmail);

    // Find the user by email
    const user = await findUserByEmail(customerEmail);
    if (!user) {
      throw new Error(`User not found for email ${customerEmail}`);
    }
    console.log('👤 Found user:', user.id);

    // Update profile to remove subscription
    await updateProfileSubscription(user.id, null, 'canceled');
    
    // Update subscription status to canceled
    await updateSubscriptionStatus(user.id, subscription.id, 'canceled');

    console.log(`✅ Successfully canceled subscription for user ${user.id}`);

  } catch (error) {
    console.error('❌ Error handling customer.subscription.deleted:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: any) {
  try {
    console.log('🔄 Processing invoice.payment_succeeded:', invoice.id);
    
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await handleSubscriptionUpdated(subscription);
    }

  } catch (error) {
    console.error('❌ Error handling invoice.payment_succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: any) {
  try {
    console.log('🔄 Processing invoice.payment_failed:', invoice.id);
    
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      
      // Get customer email
      const customer = await stripe.customers.retrieve(subscription.customer);
      const customerEmail = customer.email;
      if (!customerEmail) return;

      // Find user and update status
      const user = await findUserByEmail(customerEmail);
      if (user) {
        await updateProfileSubscription(user.id, null, 'past_due');
        await updateSubscriptionStatus(user.id, subscription.id, 'past_due');
      }
    }

  } catch (error) {
    console.error('❌ Error handling invoice.payment_failed:', error);
  }
}

// Helper function to find user by email with multiple approaches
async function findUserByEmail(email: string) {
  try {
    // First, try to find user in customers table
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingCustomer) {
      console.log('👤 Found user via customers table:', existingCustomer.id);
      return { id: existingCustomer.id };
    }

    // Fallback to auth.users lookup
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      throw new Error(`Failed to fetch users: ${authError.message}`);
    }

    const user = authUsers.users.find(u => u.email === email);
    if (user) {
      console.log('👤 Found user via auth lookup:', user.id);
      return { id: user.id };
    }

    return null;
  } catch (error) {
    console.error('❌ Error finding user by email:', error);
    throw error;
  }
}

// Helper function to ensure profile exists
async function ensureProfileExists(userId: string, email: string) {
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      console.log('🔧 Creating new profile for user:', userId);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: email.split('@')[0], // Use email prefix as default name
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        throw new Error(`Failed to create profile: ${insertError.message}`);
      }
      console.log('✅ Created new profile for user:', userId);
    } else {
      console.log('✅ Profile already exists for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error ensuring profile exists:', error);
    throw error;
  }
}

// Helper function to update profile subscription
async function updateProfileSubscription(userId: string, tier: string | null, status: string) {
  try {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }
    console.log('✅ Updated profile for user:', userId, 'tier:', tier, 'status:', status);
  } catch (error) {
    console.error('❌ Error updating profile subscription:', error);
    throw error;
  }
}

// Helper function to create or update customer record
async function createOrUpdateCustomer(userId: string, stripeCustomerId: string, email: string) {
  try {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    const customerData = {
      id: userId,
      stripe_customer_id: stripeCustomerId,
      email: email,
      updated_at: new Date().toISOString()
    };

    if (existingCustomer) {
      // Update existing customer
      const { error: updateError } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating customer:', updateError);
        throw new Error(`Failed to update customer: ${updateError.message}`);
      }
      console.log('✅ Updated customer record for user:', userId);
    } else {
      // Create new customer
      customerData.created_at = new Date().toISOString();
      const { error: insertError } = await supabase
        .from('customers')
        .insert(customerData);

      if (insertError) {
        console.error('❌ Error creating customer:', insertError);
        throw new Error(`Failed to create customer: ${insertError.message}`);
      }
      console.log('✅ Created new customer record for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error creating/updating customer:', error);
    throw error;
  }
}

// Helper function to create or update subscription record
async function createOrUpdateSubscription(userId: string, stripeSubscription: any, subscriptionTier: string) {
  try {
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscription.id)
      .maybeSingle();

    const subscriptionData = {
      user_id: userId,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer,
      status: stripeSubscription.status,
      tier: subscriptionTier,
      price_id: stripeSubscription.items.data[0].price.id,
      quantity: stripeSubscription.items.data[0].quantity,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      cancel_at: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000).toISOString() : null,
      canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      ended_at: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000).toISOString() : null,
      trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);

      if (updateError) {
        console.error('❌ Error updating subscription:', updateError);
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }
      console.log('✅ Updated subscription record:', existingSubscription.id);
      
      // Update subscription features
      await createOrUpdateSubscriptionFeatures(existingSubscription.id, subscriptionTier);
    } else {
      // Create new subscription
      subscriptionData.created_at = new Date().toISOString();
      const { data: newSubscription, error: insertError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select('id')
        .single();

      if (insertError) {
        console.error('❌ Error creating subscription:', insertError);
        throw new Error(`Failed to create subscription: ${insertError.message}`);
      }
      console.log('✅ Created new subscription record:', newSubscription.id);
      
      // Create subscription features
      await createOrUpdateSubscriptionFeatures(newSubscription.id, subscriptionTier);
    }
  } catch (error) {
    console.error('❌ Error creating/updating subscription:', error);
    throw error;
  }
}

// Helper function to update subscription status only
async function updateSubscriptionStatus(userId: string, stripeSubscriptionId: string, status: string) {
  try {
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', stripeSubscriptionId);

    if (updateError) {
      console.error('❌ Error updating subscription status:', updateError);
      throw new Error(`Failed to update subscription status: ${updateError.message}`);
    }
    console.log('✅ Updated subscription status to:', status);
  } catch (error) {
    console.error('❌ Error updating subscription status:', error);
    throw error;
  }
}

// Helper function to create or update subscription features
async function createOrUpdateSubscriptionFeatures(subscriptionId: string, subscriptionTier: string) {
  try {
    // Define feature limits based on subscription tier
    const featureMap = {
      starter: {
        max_photospheres: 5,
        max_photos: 200,
        has_video: false,
        has_priority_support: false,
        has_white_label: false,
        has_dedicated_manager: false
      },
      pro: {
        max_photospheres: 20,
        max_photos: 500,
        has_video: true,
        has_priority_support: true,
        has_white_label: false,
        has_dedicated_manager: false
      },
      enterprise: {
        max_photospheres: -1, // Unlimited
        max_photos: -1, // Unlimited
        has_video: true,
        has_priority_support: true,
        has_white_label: true,
        has_dedicated_manager: true
      }
    };

    const features = featureMap[subscriptionTier] || featureMap.starter;

    const { data: existingFeatures } = await supabase
      .from('subscription_features')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .maybeSingle();

    const featureData = {
      subscription_id: subscriptionId,
      ...features,
      updated_at: new Date().toISOString()
    };

    if (existingFeatures) {
      // Update existing features
      const { error: updateError } = await supabase
        .from('subscription_features')
        .update(featureData)
        .eq('id', existingFeatures.id);

      if (updateError) {
        console.error('❌ Error updating subscription features:', updateError);
        throw new Error(`Failed to update subscription features: ${updateError.message}`);
      }
      console.log('✅ Updated subscription features for tier:', subscriptionTier);
    } else {
      // Create new features
      featureData.created_at = new Date().toISOString();
      const { error: insertError } = await supabase
        .from('subscription_features')
        .insert(featureData);

      if (insertError) {
        console.error('❌ Error creating subscription features:', insertError);
        throw new Error(`Failed to create subscription features: ${insertError.message}`);
      }
      console.log('✅ Created subscription features for tier:', subscriptionTier);
    }
  } catch (error) {
    console.error('❌ Error creating/updating subscription features:', error);
    throw error;
  }
}