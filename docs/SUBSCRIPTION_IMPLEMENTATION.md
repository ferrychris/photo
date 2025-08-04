# Subscription System Implementation

This document outlines the complete subscription system implementation using Stripe and Supabase for the PhotoSphere application.

## Overview

The subscription system provides:
- **Three subscription tiers**: Starter, Pro, and Enterprise
- **14-day free trials** for all plans
- **Usage-based limits** for PhotoSpheres and photos
- **Feature gating** for premium features
- **Stripe integration** for payments and billing
- **Real-time subscription status** updates via webhooks

## Architecture

### Frontend Components

#### 1. Subscription Store (`src/store/subscriptionStore.ts`)
- Manages subscription state using Zustand
- Handles API calls to Supabase Edge Functions
- Provides feature checking utilities
- Caches subscription data and features

#### 2. Subscription Hooks (`src/hooks/useSubscription.ts`)
- `useSubscription()`: Main hook for subscription data and utilities
- `useFeatureGate()`: Hook for protecting premium features
- `useUsageLimit()`: Hook for checking usage limits

#### 3. UI Components
- `SubscriptionStatus`: Displays current subscription status
- `UsageMeter`: Shows usage progress bars
- `FeatureGate`: Protects premium features with upgrade prompts
- `SubscriptionManager`: Comprehensive subscription overview

### Backend Implementation

#### 1. Database Schema (Supabase)

**Subscriptions Table:**
```sql
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing')),
  price_id TEXT NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'enterprise')),
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Subscription Features Table:**
```sql
CREATE TABLE subscription_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  max_photospheres INTEGER NOT NULL,
  max_photos INTEGER NOT NULL,
  has_video BOOLEAN DEFAULT FALSE,
  has_priority_support BOOLEAN DEFAULT FALSE,
  has_white_label BOOLEAN DEFAULT FALSE,
  has_dedicated_manager BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Edge Functions

**create-checkout-session:**
- Creates Stripe checkout sessions for new subscriptions
- Handles customer creation and trial setup
- Returns checkout URL for frontend redirect

**stripe-webhook:**
- Processes Stripe webhook events
- Updates subscription status in database
- Manages subscription features based on plan

**create-portal-session:**
- Creates Stripe customer portal sessions
- Allows users to manage billing and subscriptions

## Subscription Plans

### Starter Plan ($45/month)
- 5 PhotoSpheres
- Up to 200 photos
- Virtual PhotoBooth
- Basic moderation tools
- 14-day free trial

### Pro Plan ($99/month) - Most Popular
- 20 PhotoSpheres
- Up to 500 photos
- Advanced camera animations
- Built-in video recording
- Priority support
- 14-day free trial

### Enterprise Plan ($299/month)
- Unlimited PhotoSpheres
- Unlimited photos
- White label branding
- Dedicated account manager
- Custom training sessions
- 24/7 premium support

## Feature Gating

### Usage-Based Limits
```typescript
// Check if user can create more PhotoSpheres
const { canUse, limit, remaining } = useUsageLimit('photospheres', currentCount);

// Check if user can upload more photos
const { canUse: canUploadPhotos } = useUsageLimit('photos', currentPhotoCount);
```

### Feature-Based Gates
```typescript
// Protect video recording feature
<FeatureGate feature="has_video">
  <VideoRecordingComponent />
</FeatureGate>

// Check feature access in code
const { hasAccess } = useFeatureGate('has_priority_support');
```

## Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Stripe Configuration
1. Create products and prices in Stripe Dashboard
2. Update price IDs in `PLAN_CONFIGS` in `subscriptionStore.ts`
3. Set up webhook endpoint pointing to your Supabase Edge Function
4. Configure webhook events: `customer.subscription.*`, `invoice.payment_*`

### 3. Database Setup
Run the migration in Supabase to create the subscription tables:
```sql
-- Run the migration from the stripe-webhook Edge Function
```

### 4. Edge Functions Deployment
The Edge Functions are already deployed to your Supabase project:
- `create-checkout-session`
- `stripe-webhook`
- `create-portal-session`

## Usage Examples

### 1. Protecting a Component
```typescript
import FeatureGate from '../components/subscription/FeatureGate';

const VideoComponent = () => (
  <FeatureGate feature="has_video" upgradeMessage="Upgrade to Pro to unlock video recording">
    <VideoRecorder />
  </FeatureGate>
);
```

### 2. Checking Usage Limits
```typescript
const CreatePhotosphereButton = () => {
  const { canUse, remaining } = useUsageLimit('photospheres', currentCount);
  
  return (
    <button disabled={!canUse}>
      Create PhotoSphere {!canUse && `(${remaining} remaining)`}
    </button>
  );
};
```

### 3. Subscription Status Display
```typescript
import SubscriptionManager from '../components/subscription/SubscriptionManager';

const Dashboard = () => (
  <div>
    <SubscriptionManager 
      photosphereCount={5}
      photoCount={150}
      showUsage={true}
      showFeatures={true}
    />
  </div>
);
```

## Testing

### Test Cards (Stripe Test Mode)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Webhook Testing
Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

## Monitoring

### Key Metrics to Track
- Subscription conversion rates
- Trial-to-paid conversion
- Churn rate by plan
- Feature usage by plan
- Support ticket volume by plan

### Stripe Dashboard
Monitor subscription metrics, failed payments, and customer lifecycle in the Stripe Dashboard.

### Supabase Analytics
Track subscription-related database queries and Edge Function performance in Supabase.

## Security Considerations

1. **Webhook Verification**: All webhooks are verified using Stripe's signature
2. **RLS Policies**: Database access is restricted by Row Level Security
3. **JWT Verification**: Edge Functions verify user authentication
4. **Environment Variables**: Sensitive keys are stored securely

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL in Stripe Dashboard
   - Verify webhook secret matches environment variable
   - Check Edge Function logs in Supabase

2. **Subscription Not Updating**
   - Check webhook event processing
   - Verify database permissions
   - Check for failed webhook deliveries in Stripe

3. **Feature Gates Not Working**
   - Ensure subscription data is fetched
   - Check feature flags in database
   - Verify plan configuration matches Stripe

### Debug Tools
- Supabase Edge Function logs
- Stripe webhook logs
- Browser developer tools for frontend debugging

## Future Enhancements

1. **Annual Billing**: Add yearly subscription options with discounts
2. **Usage Alerts**: Notify users when approaching limits
3. **Plan Recommendations**: Suggest plan upgrades based on usage
4. **Referral System**: Implement referral bonuses
5. **Enterprise Features**: Add SSO, custom domains, API access
6. **Analytics Dashboard**: Detailed usage and billing analytics

## Support

For subscription-related issues:
1. Check this documentation
2. Review Stripe Dashboard for payment issues
3. Check Supabase logs for technical issues
4. Contact development team for complex problems
