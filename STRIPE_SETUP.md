# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment processing for My FX Journal subscription management.

## Prerequisites

- A Stripe account (free at https://stripe.com)
- Your My FX Journal application with Supabase configured
- Node.js backend or serverless functions capability

## Step 1: Create Stripe Account

1. Go to https://stripe.com and sign up
2. Complete your account setup
3. Verify your email address
4. You'll start in Test Mode (perfect for development)

## Step 2: Get Your API Keys

1. In your Stripe Dashboard, click "Developers" in the left sidebar
2. Click "API keys"
3. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` in test mode)
   - **Secret key** (starts with `sk_test_` in test mode) - Keep this secure!
4. Copy both keys - you'll need them soon

## Step 3: Create Your Product and Price

1. In Stripe Dashboard, go to "Products" → "Add product"
2. Fill in the details:
   - **Name**: My FX Journal Pro
   - **Description**: Professional trading journal with advanced analytics
   - **Pricing model**: Recurring
   - **Price**: $4.99
   - **Billing period**: Monthly
   - **Currency**: USD
3. Click "Save product"
4. Copy the **Price ID** (starts with `price_`) - you'll need this

## Step 4: Configure Environment Variables

1. In your project root, open or create `.env` file
2. Add your Stripe credentials:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_STRIPE_PRICE_ID_MONTHLY=price_your_price_id_here

# Backend/Serverless (keep these secure, never expose to frontend)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 5: Set Up Backend API Endpoints

You need to create secure backend endpoints to handle Stripe operations. Here are the required endpoints:

### 5.1 Create Checkout Session

**Endpoint**: `POST /api/stripe/create-checkout-session`

```javascript
// Example using Express.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  const { priceId, userId, successUrl, cancelUrl } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      subscription_data: {
        trial_period_days: 14,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 5.2 Create Customer Portal Session

**Endpoint**: `POST /api/stripe/create-portal-session`

```javascript
app.post('/api/stripe/create-portal-session', async (req, res) => {
  const { customerId, returnUrl } = req.body;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 5.3 Get Subscription Status

**Endpoint**: `GET /api/stripe/subscription/:userId`

```javascript
app.get('/api/stripe/subscription/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Query your database for customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.json(null);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.json(null);
    }

    const subscription = subscriptions.data[0];
    res.json({
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      plan: {
        id: 'pro',
        name: 'Pro',
        price: subscription.items.data[0].price.unit_amount / 100,
        interval: subscription.items.data[0].price.recurring.interval,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 5.4 Cancel Subscription

**Endpoint**: `POST /api/stripe/cancel-subscription`

```javascript
app.post('/api/stripe/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body;

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Step 6: Set Up Webhooks

Webhooks notify your application when events happen in Stripe (e.g., successful payment, subscription canceled).

### 6.1 Create Webhook Endpoint

1. In Stripe Dashboard, go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

### 6.2 Implement Webhook Handler

```javascript
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // Save customer ID to your database
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: session.customer })
          .eq('id', session.client_reference_id);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        // Update subscription status in your database
        break;

      case 'invoice.payment_succeeded':
        // Handle successful payment
        break;

      case 'invoice.payment_failed':
        // Handle failed payment
        break;
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

## Step 7: Update Supabase Schema

Add Stripe-related fields to your profiles table:

```sql
ALTER TABLE profiles
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN subscription_id TEXT,
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
```

## Step 8: Test the Integration

### Test Mode

1. Use test card numbers (from Stripe docs):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date, any CVC

2. Test the flow:
   - Click "Upgrade to Pro"
   - Enter test card details
   - Complete checkout
   - Verify subscription appears in your app
   - Test cancellation
   - Test customer portal

### Webhook Testing

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe` (Mac) or download from Stripe
2. Login: `stripe login`
3. Forward webhooks to local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Test events: `stripe trigger checkout.session.completed`

## Step 9: Go Live

When ready for production:

1. Complete your Stripe account activation
2. Switch to Live mode in Stripe Dashboard
3. Get your Live API keys (start with `pk_live_` and `sk_live_`)
4. Update your production environment variables
5. Update webhook endpoint to production URL
6. Test with real card (small amount first!)

## Security Best Practices

1. **Never expose secret keys** - Keep them server-side only
2. **Validate webhooks** - Always verify webhook signatures
3. **Use HTTPS** - All Stripe communication must be over HTTPS
4. **Store minimal data** - Don't store full card numbers
5. **Handle errors gracefully** - Show user-friendly error messages
6. **Log everything** - Keep audit logs of all payment events

## Common Issues & Solutions

### Issue: "No such price"
**Solution**: Make sure you're using the correct Price ID from Stripe Dashboard

### Issue: Webhook not receiving events
**Solution**: 
- Check webhook URL is publicly accessible
- Verify signing secret is correct
- Check webhook endpoint is listening for POST requests

### Issue: "Customer not found"
**Solution**: Make sure customer ID is saved to database after checkout

### Issue: Subscription not showing
**Solution**: 
- Check webhook events are being processed
- Verify database is being updated correctly
- Check for errors in webhook handler logs

## Support Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: Available in Dashboard
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Testing**: https://stripe.com/docs/webhooks/test

## Cost Breakdown

- **Stripe Fees**: 2.9% + $0.30 per successful transaction
- **Example**: $4.99 subscription = $0.44 fee, you receive $4.55
- **No monthly fees** for standard Stripe account
- **Free in test mode** - test as much as you want!

---

**Congratulations!** 🎉 You now have a fully functional payment system integrated with your My FX Journal application!