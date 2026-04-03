// Google Analytics Integration Library
// Handles tracking and analytics for the application

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

/**
 * Initialize Google Analytics
 * Call this once when the app loads
 */
export function initGA(): void {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics Measurement ID not configured');
    return;
  }

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll manually track page views
  });

  console.log('Google Analytics initialized');
}

/**
 * Track page view
 * Call this on route changes
 */
export function trackPageView(path: string, title?: string): void {
  if (!window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  });
}

/**
 * Track custom events
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
): void {
  if (!window.gtag) return;

  window.gtag('event', eventName, eventParams);
}

/**
 * Track user login
 */
export function trackLogin(method: string = 'email'): void {
  trackEvent('login', {
    method,
  });
}

/**
 * Track user signup
 */
export function trackSignup(method: string = 'email'): void {
  trackEvent('sign_up', {
    method,
  });
}

/**
 * Track trade actions
 */
export function trackTradeAction(action: 'add' | 'edit' | 'delete' | 'import'): void {
  trackEvent('trade_action', {
    action,
  });
}

/**
 * Track MetaTrader import
 */
export function trackMetaTraderImport(
  platform: 'MT4' | 'MT5',
  tradesCount: number,
  success: boolean
): void {
  trackEvent('metatrader_import', {
    platform,
    trades_count: tradesCount,
    success,
  });
}

/**
 * Track subscription events
 */
export function trackSubscription(
  action: 'upgrade' | 'cancel' | 'resume',
  plan?: string
): void {
  trackEvent('subscription', {
    action,
    plan,
  });
}

/**
 * Track payment events
 */
export function trackPurchase(
  transactionId: string,
  value: number,
  currency: string = 'USD',
  items?: Array<{ item_id: string; item_name: string; price: number }>
): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    items,
  });
}

/**
 * Track export actions
 */
export function trackExport(format: 'csv' | 'json' | 'pdf'): void {
  trackEvent('export', {
    format,
  });
}

/**
 * Track filter usage
 */
export function trackFilter(
  filterType: 'strategy' | 'session' | 'time_period',
  value: string
): void {
  trackEvent('filter_used', {
    filter_type: filterType,
    value,
  });
}

/**
 * Track AI analysis usage
 */
export function trackAIAnalysis(
  analysisType: string,
  tradesCount: number
): void {
  trackEvent('ai_analysis', {
    analysis_type: analysisType,
    trades_count: tradesCount,
  });
}

/**
 * Track errors
 */
export function trackError(
  errorMessage: string,
  errorLocation: string,
  fatal: boolean = false
): void {
  trackEvent('exception', {
    description: errorMessage,
    location: errorLocation,
    fatal,
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  featureName: string,
  metadata?: Record<string, unknown>
): void {
  trackEvent('feature_used', {
    feature_name: featureName,
    ...metadata,
  });
}

/**
 * Track search queries
 */
export function trackSearch(searchTerm: string, resultsCount: number): void {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
}

/**
 * Track social share
 */
export function trackShare(platform: string, contentType: string): void {
  trackEvent('share', {
    method: platform,
    content_type: contentType,
  });
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (!window.gtag) return;

  window.gtag('set', 'user_properties', properties);
}

/**
 * Set user ID for cross-device tracking
 */
export function setUserId(userId: string): void {
  if (!window.gtag) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId,
  });
}

/**
 * Track timing/performance
 */
export function trackTiming(
  name: string,
  value: number,
  category?: string
): void {
  trackEvent('timing_complete', {
    name,
    value,
    event_category: category,
  });
}

/**
 * Track outbound links
 */
export function trackOutboundLink(url: string): void {
  trackEvent('click', {
    event_category: 'outbound',
    event_label: url,
  });
}

/**
 * Opt out of tracking (GDPR compliance)
 */
export function optOutTracking(): void {
  if (!GA_MEASUREMENT_ID) return;
  
  const disableStr = `ga-disable-${GA_MEASUREMENT_ID}`;
  (window as Record<string, boolean>)[disableStr] = true;
  document.cookie = `${disableStr}=true; expires=Thu, 31 Dec 2099 23:59:59 UTC; path=/`;
}

/**
 * Check if user has opted out
 */
export function hasOptedOut(): boolean {
  if (!GA_MEASUREMENT_ID) return true;
  
  const disableStr = `ga-disable-${GA_MEASUREMENT_ID}`;
  return document.cookie.indexOf(`${disableStr}=true`) > -1;
}