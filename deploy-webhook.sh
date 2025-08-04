#!/bin/bash

# Deploy Stripe webhook with JWT verification disabled
# This script requires Supabase CLI to be installed

echo "🚀 Deploying Stripe webhook with JWT verification disabled..."

# Navigate to project directory
cd "$(dirname "$0")"

# Deploy the webhook function with --no-verify-jwt flag
supabase functions deploy stripe-webhook --no-verify-jwt

echo "✅ Webhook deployed successfully!"
echo "📍 Webhook URL: https://xqgtuvzlrvbwwesuvitp.supabase.co/functions/v1/stripe-webhook"
echo ""
echo "🔧 Configure this URL in your Stripe Dashboard:"
echo "   Events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, checkout.session.completed"
