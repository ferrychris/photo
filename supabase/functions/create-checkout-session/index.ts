import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Create Supabase client with auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Parse the request body
    const { planType } = await req.json();
    if (!planType) {
      return new Response(JSON.stringify({ error: 'Missing plan type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Define plan configurations
    const planConfigs = {
      starter: {
        name: 'Starter Plan',
        price: 4500, // $45.00
        features: ['5 PhotoSpheres', '100 Photos', 'Basic Support']
      },
      pro: {
        name: 'Pro Plan',
        price: 9900, // $99.00
        features: ['20 PhotoSpheres', '500 Photos', 'Video Recording', 'Priority Support']
      },
      enterprise: {
        name: 'Enterprise Plan',
        price: 49900, // $499.00
        features: ['100 PhotoSpheres', '2000 Photos', 'Video Recording', 'White Label', 'Dedicated Manager']
      }
    };

    const planConfig = planConfigs[planType];
    if (!planConfig) {
      return new Response(JSON.stringify({ error: 'Invalid plan type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create or retrieve product
    let product;
    const existingProducts = await stripe.products.list({
      active: true,
      limit: 100,
    });

    const existingProduct = existingProducts.data.find(p => 
      p.name.toLowerCase().includes(planType.toLowerCase())
    );

    if (existingProduct) {
      product = existingProduct;
    } else {
      product = await stripe.products.create({
        name: planConfig.name,
        description: `PhotoSphere ${planConfig.name}`,
        metadata: {
          plan_type: planType
        }
      });
    }

    // Create or retrieve price
    let price;
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });

    if (existingPrices.data.length > 0) {
      price = existingPrices.data[0];
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: planConfig.price,
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan_type: planType
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/dashboard/profile?success=true`,
      cancel_url: `${req.headers.get('origin')}/dashboard/profile?canceled=true`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        plan_type: planType
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: planType
        }
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
