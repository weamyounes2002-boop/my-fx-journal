// Stripe Integration Library
// Handles subscription management and payment processing

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    interval: 'month',
    features: [
      '14-day free trial',
      'Unlimited trades',
      'Basic analytics',
      'Trade journal',
      'Position calculator'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    interval: 'month',
    features: [
      'Everything in Free',
      'Advanced analytics',
      'AI-powered insights',
      'MetaTrader integration',
      'Export & backup',
      'Priority support'
    ],
    stripePriceId: process.env.VITE_STRIPE_PRICE_ID_MONTHLY
  }
];

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  created: string;
  invoicePdf?: string;
}

export interface SubscriptionStatus {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
}

/**
 * Initialize Stripe checkout session
 * This should be called from the backend in production
 */
export async function createCheckoutSession(
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  // In production, this would call your backend API
  // which then calls Stripe API with your secret key
  
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userId,
        successUrl,
        cancelUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const data = await response.json();
    return {
      sessionId: data.sessionId,
      url: data.url,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create customer portal session for managing subscription
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  try {
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        returnUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }

    const data = await response.json();
    return { url: data.url };
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
  try {
    const response = await fetch(`/api/stripe/subscription/${userId}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

/**
 * Get payment methods for user
 */
export async function getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
  try {
    const response = await fetch(`/api/stripe/payment-methods/${customerId}`);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.paymentMethods || [];
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
}

/**
 * Get billing history
 */
export async function getInvoices(customerId: string): Promise<Invoice[]> {
  try {
    const response = await fetch(`/api/stripe/invoices/${customerId}`);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.invoices || [];
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
}

/**
 * Resume subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/stripe/resume-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error resuming subscription:', error);
    return false;
  }
}

/**
 * Format currency for display
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Calculate trial end date
 */
export function getTrialEndDate(daysFromNow: number = 14): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

/**
 * Check if user is in trial period
 */
export function isInTrialPeriod(trialEndDate: string): boolean {
  return new Date(trialEndDate) > new Date();
}

/**
 * Get days remaining in trial
 */
export function getDaysRemainingInTrial(trialEndDate: string): number {
  const end = new Date(trialEndDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}