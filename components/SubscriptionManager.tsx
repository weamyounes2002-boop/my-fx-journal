import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Download,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  SUBSCRIPTION_PLANS,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  getPaymentMethods,
  getInvoices,
  cancelSubscription,
  resumeSubscription,
  formatPrice,
  getDaysRemainingInTrial,
  type SubscriptionStatus,
  type PaymentMethod,
  type Invoice
} from '@/lib/stripe';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export default function SubscriptionManager() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [subStatus, methods, invoiceList] = await Promise.all([
        getSubscriptionStatus(user.id),
        getPaymentMethods(user.id),
        getInvoices(user.id)
      ]);

      setSubscription(subStatus);
      setPaymentMethods(methods);
      setInvoices(invoiceList);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const proPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'pro');
      if (!proPlan?.stripePriceId) {
        toast.error('Subscription plan not configured');
        return;
      }

      const { url } = await createCheckoutSession(
        proPlan.stripePriceId,
        user.id,
        `${window.location.origin}/profile-settings?success=true`,
        `${window.location.origin}/profile-settings?canceled=true`
      );

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to start checkout process');
      console.error('Checkout error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { url } = await createPortalSession(
        user.id,
        `${window.location.origin}/profile-settings`
      );

      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to open billing portal');
      console.error('Portal error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setIsProcessing(true);
    try {
      const success = await cancelSubscription(subscription.id);
      
      if (success) {
        toast.success('Subscription will be canceled at the end of the billing period');
        await loadSubscriptionData();
      } else {
        toast.error('Failed to cancel subscription');
      }
    } catch (error) {
      toast.error('An error occurred while canceling subscription');
      console.error('Cancel error:', error);
    } finally {
      setIsProcessing(false);
      setShowCancelDialog(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;

    setIsProcessing(true);
    try {
      const success = await resumeSubscription(subscription.id);
      
      if (success) {
        toast.success('Subscription resumed successfully');
        await loadSubscriptionData();
      } else {
        toast.error('Failed to resume subscription');
      }
    } catch (error) {
      toast.error('An error occurred while resuming subscription');
      console.error('Resume error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: BadgeVariant; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trialing: { variant: 'secondary', label: 'Trial' },
      canceled: { variant: 'destructive', label: 'Canceled' },
      past_due: { variant: 'destructive', label: 'Past Due' }
    };

    const config = variants[status] || { variant: 'secondary' as BadgeVariant, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{subscription.plan.name}</h3>
                  <p className="text-sm text-gray-600">
                    {formatPrice(subscription.plan.price)} / {subscription.plan.interval}
                  </p>
                </div>
                {getStatusBadge(subscription.status)}
              </div>

              {subscription.status === 'trialing' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Free Trial Active</p>
                      <p className="text-sm text-blue-700">
                        {getDaysRemainingInTrial(subscription.currentPeriodEnd)} days remaining in your trial
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  }
                </span>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Manage Billing
                </Button>

                {subscription.cancelAtPeriodEnd ? (
                  <Button
                    onClick={handleResumeSubscription}
                    disabled={isProcessing}
                  >
                    Resume Subscription
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isProcessing}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600">You don't have an active subscription</p>
              <Button onClick={handleUpgrade} disabled={isProcessing}>
                Upgrade to Pro
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      {paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        {method.brand?.toUpperCase()} •••• {method.last4}
                      </p>
                      {method.expiryMonth && method.expiryYear && (
                        <p className="text-sm text-gray-600">
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </p>
                      )}
                    </div>
                  </div>
                  {method.isDefault && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {invoice.status === 'paid' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {formatPrice(invoice.amount, invoice.currency)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.created).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                      {invoice.status}
                    </Badge>
                    {invoice.invoicePdf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(invoice.invoicePdf, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-4 ${
                  subscription?.plan.id === plan.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
              >
                <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                <p className="text-2xl font-bold mb-4">
                  {formatPrice(plan.price)}
                  <span className="text-sm font-normal text-gray-600">/{plan.interval}</span>
                </p>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {subscription?.plan.id === plan.id && (
                  <Badge className="w-full justify-center">Current Plan</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of your current billing period
              ({subscription && new Date(subscription.currentPeriodEnd).toLocaleDateString()}).
              After that, you'll lose access to Pro features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}