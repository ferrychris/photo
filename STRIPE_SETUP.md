# Stripe External Checkout Setup Guide

## Updated Pricing
- **Starter**: $45/month
- **Pro**: $99/month  
- **Enterprise**: $499/month (updated from $299)

## No Additional Dependencies Required

This implementation uses Stripe's external checkout pages, so no additional frontend dependencies are needed. The system creates products and prices dynamically through the Edge Function.

## Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Stripe Products Setup

1. **Update Stripe Products**: Use the MCP commands or run the setup script:
   ```bash
   node scripts/setup-stripe-products.js
   ```

2. **Update Price IDs**: After creating products, update the `PLAN_CONFIGS` in `src/store/subscriptionStore.ts` with the correct price IDs.

## Features Implemented

### ✅ External Stripe Checkout Integration
- Secure, hosted checkout pages by Stripe
- No PCI compliance requirements for your app
- Built-in payment method support
- Mobile-optimized checkout experience

### ✅ Dynamic Product/Price Creation
- `create-checkout-session`: Automatically creates products and recurring prices
- Enhanced webhook handling for subscription events
- Proper error handling and user feedback
- Support for promotion codes and billing address collection

### ✅ Simplified UI Flow
- Direct redirect to Stripe checkout
- Clean success/cancel URL handling
- Seamless integration with existing Profile page
- No complex frontend payment forms to maintain

## Usage

The subscription system uses external Stripe checkout pages. When users click "Upgrade" on any plan:

1. System creates/finds the appropriate Stripe product and recurring price
2. User is redirected to Stripe's secure checkout page
3. Users enter their payment information on Stripe's hosted page
4. After successful payment, user is redirected back to your app
5. Subscription is activated via webhook

## Testing

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

## Next Steps

1. Set up your environment variables (no additional packages needed)
2. Test the payment flow with Stripe test cards
3. Configure webhooks in your Stripe Dashboard
4. Products and prices are created automatically

## Benefits of External Checkout

- **Reduced complexity**: No frontend payment forms to maintain
- **Better security**: Stripe handles all payment data
- **Automatic updates**: Stripe updates checkout features automatically
- **Global support**: Built-in support for international payments
- **Compliance**: PCI compliance handled by Stripe

The system is now ready for production with external Stripe checkout and the updated Enterprise pricing of $499/month.
