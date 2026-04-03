# Google Analytics Setup Guide

This guide will help you set up Google Analytics 4 (GA4) for tracking user behavior and analytics in My FX Journal.

## Prerequisites

- A Google account
- Access to your website/application
- Basic understanding of analytics concepts

## Step 1: Create Google Analytics Account

1. Go to https://analytics.google.com
2. Click "Start measuring" or "Admin" (if you already have an account)
3. Click "Create Account"
4. Fill in account details:
   - **Account name**: My FX Journal (or your preferred name)
   - Check data sharing settings as desired
5. Click "Next"

## Step 2: Create a Property

1. **Property name**: My FX Journal Production (or your preferred name)
2. **Reporting time zone**: Select your timezone
3. **Currency**: USD (or your preferred currency)
4. Click "Next"

## Step 3: Set Up Data Stream

1. Select platform: **Web**
2. Fill in details:
   - **Website URL**: https://yourdomain.com
   - **Stream name**: My FX Journal Web
3. Click "Create stream"

## Step 4: Get Your Measurement ID

1. After creating the stream, you'll see your **Measurement ID**
2. It looks like: `G-XXXXXXXXXX`
3. Copy this ID - you'll need it for configuration

## Step 5: Configure Environment Variables

1. Open or create `.env` file in your project root
2. Add your Google Analytics Measurement ID:

```env
# Google Analytics Configuration
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

3. Replace `G-XXXXXXXXXX` with your actual Measurement ID

## Step 6: Initialize Analytics in Your App

The analytics is already integrated! Here's what's set up:

### Automatic Tracking

1. **Page Views**: Automatically tracked on every route change
2. **User Sessions**: Tracked automatically
3. **Device/Browser Info**: Collected automatically

### Custom Events Tracked

The following events are automatically tracked in the app:

#### User Authentication
- `login` - When user logs in
- `sign_up` - When user creates account

#### Trade Management
- `trade_action` - When user adds/edits/deletes trades
- `metatrader_import` - When importing from MT4/MT5

#### Subscription & Payments
- `subscription` - Upgrade, cancel, or resume subscription
- `purchase` - Successful payment completion

#### Features Usage
- `export` - When exporting data (CSV, JSON, PDF)
- `filter_used` - When applying filters
- `ai_analysis` - When using AI analysis features
- `feature_used` - General feature usage tracking

#### Engagement
- `search` - Search queries and results
- `share` - Social media shares
- `click` - Outbound link clicks

## Step 7: Verify Installation

### Method 1: Real-time Reports

1. Go to Google Analytics dashboard
2. Navigate to **Reports** → **Realtime**
3. Open your application in a browser
4. You should see your activity in real-time

### Method 2: Browser Console

1. Open your application
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for "Google Analytics initialized" message
5. Check Network tab for requests to `google-analytics.com`

### Method 3: Google Analytics Debugger

1. Install "Google Analytics Debugger" Chrome extension
2. Enable the extension
3. Open your application
4. Check Console for detailed GA debug information

## Step 8: Set Up Enhanced Measurement (Optional)

In GA4, enable enhanced measurement for automatic tracking:

1. Go to **Admin** → **Data Streams**
2. Click your web stream
3. Click **Enhanced measurement**
4. Enable desired options:
   - Page views ✓
   - Scrolls ✓
   - Outbound clicks ✓
   - Site search ✓
   - Video engagement ✓
   - File downloads ✓

## Step 9: Create Custom Reports

### Recommended Reports

1. **Trading Activity Dashboard**
   - Trades added per day
   - Import success rate
   - Most used features

2. **User Engagement**
   - Session duration
   - Pages per session
   - Bounce rate

3. **Conversion Tracking**
   - Trial signups
   - Subscription upgrades
   - Feature adoption

### How to Create Custom Reports

1. Go to **Explore** in GA4
2. Click "Blank" to create new exploration
3. Add dimensions and metrics
4. Configure visualizations
5. Save and share

## Step 10: Set Up Conversions

Mark important events as conversions:

1. Go to **Admin** → **Events**
2. Find events like `sign_up`, `purchase`, `subscription`
3. Toggle "Mark as conversion"

## Privacy & GDPR Compliance

### Cookie Consent

The app includes a cookie consent banner that:
- Shows on first visit
- Allows users to accept or decline tracking
- Stores preference in localStorage
- Respects user choice

### User Rights

Users can:
- Opt out of tracking at any time
- Request data deletion (through GA4 settings)
- View what data is collected

### Data Retention

Configure in GA4:

1. Go to **Admin** → **Data Settings** → **Data Retention**
2. Set retention period (2 months to 14 months)
3. Enable "Reset user data on new activity" if desired

## Advanced Configuration

### User ID Tracking

Track users across devices:

```typescript
import { setUserId } from '@/lib/analytics';

// After user logs in
setUserId(user.id);
```

### Custom User Properties

Set custom properties:

```typescript
import { setUserProperties } from '@/lib/analytics';

setUserProperties({
  subscription_tier: 'pro',
  account_age_days: 30,
  total_trades: 150
});
```

### E-commerce Tracking

Track subscription purchases:

```typescript
import { trackPurchase } from '@/lib/analytics';

trackPurchase(
  'txn_123456',
  4.99,
  'USD',
  [
    {
      item_id: 'pro_monthly',
      item_name: 'Pro Monthly Subscription',
      price: 4.99
    }
  ]
);
```

## Debugging Common Issues

### Issue: No data showing in GA4

**Solutions:**
1. Check Measurement ID is correct
2. Verify `.env` file is loaded
3. Check browser console for errors
4. Ensure ad blockers are disabled for testing
5. Wait 24-48 hours for data to appear in reports

### Issue: Events not tracking

**Solutions:**
1. Check event names match GA4 requirements (lowercase, underscores)
2. Verify gtag is initialized before tracking events
3. Check browser console for GA errors
4. Use DebugView in GA4 to see real-time events

### Issue: Cookie consent blocking analytics

**Solutions:**
1. Ensure user has accepted cookies
2. Check localStorage for 'cookie-consent' value
3. Clear cookies and test consent flow

## Best Practices

### 1. Event Naming
- Use lowercase with underscores: `trade_added`
- Be consistent across the app
- Keep names descriptive but concise

### 2. Event Parameters
- Limit to 25 parameters per event
- Use consistent parameter names
- Keep values under 100 characters

### 3. Privacy
- Don't track PII (personally identifiable information)
- Hash or encrypt sensitive data
- Respect user opt-out preferences
- Comply with GDPR/CCPA regulations

### 4. Performance
- Load GA asynchronously
- Don't block page rendering
- Batch events when possible
- Use sampling for high-traffic sites

### 5. Testing
- Test in development with a separate GA4 property
- Use GA4 DebugView for real-time testing
- Verify events before production deployment

## Useful GA4 Features

### 1. Funnel Analysis
Track user journey from signup to subscription:
- Visit landing page
- Sign up
- Add first trade
- Upgrade to Pro

### 2. Cohort Analysis
Analyze user retention over time:
- Day 1, 7, 30 retention rates
- Feature adoption by cohort
- Subscription conversion by cohort

### 3. Predictive Metrics
GA4 provides AI-powered predictions:
- Purchase probability
- Churn probability
- Revenue prediction

### 4. Audience Builder
Create custom audiences for:
- Remarketing campaigns
- A/B testing
- Personalization

## Monitoring & Alerts

### Set Up Alerts

1. Go to **Admin** → **Custom Alerts**
2. Create alerts for:
   - Sudden traffic drops
   - Spike in errors
   - Conversion rate changes
   - Revenue anomalies

### Regular Checks

Weekly:
- Review user acquisition
- Check conversion rates
- Monitor feature usage

Monthly:
- Analyze user retention
- Review custom reports
- Optimize based on insights

## Resources

- **GA4 Documentation**: https://support.google.com/analytics
- **GA4 Academy**: https://analytics.google.com/analytics/academy/
- **Measurement Protocol**: https://developers.google.com/analytics/devguides/collection/protocol/ga4
- **GA4 Events Reference**: https://support.google.com/analytics/answer/9267735

## Cost

- **GA4 is FREE** for most use cases
- Free tier includes:
  - Up to 10 million events per month
  - Standard reports and explorations
  - 14 months of data retention
- **GA4 360** (paid) for enterprise needs

---

**Congratulations!** 🎉 You now have Google Analytics tracking set up for comprehensive insights into user behavior and application performance!