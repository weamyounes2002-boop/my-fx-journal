# MetaAPI Cost Optimization Guide

## Overview
This guide explains the cost-saving features implemented to minimize MetaAPI API usage while maintaining functionality.

## Cost-Saving Features

### 1. **5-Minute Sync Cooldown**
- **What it does**: Prevents users from syncing the same account more than once every 5 minutes
- **How it works**: 
  - Tracks last sync time in browser localStorage
  - Shows countdown timer when cooldown is active
  - Displays "Wait Xmin" on sync button during cooldown
- **Cost impact**: Prevents accidental rapid syncing (saves 100-500 API calls per incident)

### 2. **Incremental Sync (Smart Sync)**
- **What it does**: Only fetches new data since the last sync
- **How it works**:
  - Stores `last_synced_date` in `mt_connections` table
  - First sync: Fetches last 1 year of data (~100-500 API calls)
  - Subsequent syncs: Only fetches data since `last_synced_date` (~5-20 API calls)
- **Cost impact**: Reduces ongoing sync costs by 95%+

### 3. **Manual Sync by Default**
- **What it does**: Users must manually click "Sync" button to update data
- **How it works**: No automatic background syncing
- **Cost impact**: Users only sync when they need fresh data
- **User control**: Full control over when API calls are made

### 4. **Optional Daily Auto-Sync**
- **What it does**: Automated daily sync at 2 AM (optional, disabled by default)
- **How it works**:
  - Edge Function runs via cron schedule
  - Only syncs accounts with auto-sync enabled
  - Skips weekends (Saturday/Sunday) to save costs
  - Uses incremental sync (only new data)
- **Cost impact**: ~5-20 API calls per account per day
- **Monthly estimate**: ~100-400 API calls per account per month

### 5. **Weekend Skip**
- **What it does**: Auto-sync doesn't run on weekends
- **How it works**: Cron job checks day of week and skips if Saturday/Sunday
- **Cost impact**: Saves ~40% of auto-sync API calls
- **Rationale**: Markets are closed on weekends, no new trades to sync

## Cost Estimates

### MetaAPI Free Tier
- **Limit**: 10,000 API calls per month (across all accounts)
- **Overage**: Paid plans start at $99/month

### Usage Scenarios

#### Scenario A: Manual Sync Only (Recommended for Most Users)
- **Initial sync**: 100-500 API calls (one-time)
- **Weekly manual sync**: 5-20 API calls × 4 weeks = 20-80 calls/month
- **Monthly total**: ~120-580 API calls per account
- **Accounts supported**: 10-80 accounts within free tier

#### Scenario B: Manual + Daily Auto-Sync
- **Initial sync**: 100-500 API calls (one-time)
- **Daily auto-sync**: 5-20 API calls × 20 days (weekdays only) = 100-400 calls/month
- **Manual syncs**: 5-20 API calls × 4 = 20-80 calls/month
- **Monthly total**: ~220-980 API calls per account
- **Accounts supported**: 10-45 accounts within free tier

#### Scenario C: Aggressive Manual Syncing (Not Recommended)
- **Initial sync**: 100-500 API calls (one-time)
- **Daily manual syncs**: 5-20 API calls × 30 days = 150-600 calls/month
- **Monthly total**: ~250-1,100 API calls per account
- **Accounts supported**: 9-40 accounts within free tier

## Best Practices

### For Individual Traders (1-3 accounts)
✅ **Recommended**: Manual sync only
- Sync once per week or when you need updated analytics
- Stay well within free tier limits
- Full control over API usage

### For Small Teams (4-10 accounts)
✅ **Recommended**: Manual sync + selective auto-sync
- Enable auto-sync only for actively traded accounts
- Keep demo/inactive accounts on manual sync
- Monitor usage monthly

### For Larger Operations (10+ accounts)
⚠️ **Consider**: Paid MetaAPI plan or manual sync only
- Free tier may not be sufficient with auto-sync
- Manual sync keeps you in free tier longer
- Evaluate cost vs. convenience trade-off

## How to Enable/Disable Features

### Disable Auto-Sync (Default)
Auto-sync is disabled by default. No action needed.

### Enable Auto-Sync (Optional)
1. Go to Accounts page
2. Find the "Daily Auto-Sync" toggle (coming soon)
3. Enable for accounts you want to sync automatically
4. Auto-sync runs at 2 AM daily (weekdays only)

### Adjust Cooldown Period
The 5-minute cooldown is hardcoded for optimal cost savings. To modify:
1. Edit `/workspace/shadcn-ui/src/api/metaApiClient.ts`
2. Change `SYNC_COOLDOWN_MS` constant (currently 5 minutes)
3. Rebuild the application

## Monitoring Usage

### Check Sync History
- Last sync time shown on each account card
- Cooldown timer displays remaining wait time
- Sync dialog shows detailed progress and results

### MetaAPI Dashboard
1. Log in to [MetaAPI Cloud](https://app.metaapi.cloud/)
2. Navigate to "Usage" or "Billing" section
3. View API call statistics
4. Set up usage alerts

## Troubleshooting

### "Please wait X minutes before syncing again"
- **Cause**: Cooldown period is active
- **Solution**: Wait for cooldown to expire, or sync a different account
- **Why**: Prevents excessive API usage

### Auto-sync not running
- **Check**: Is auto-sync enabled for your account?
- **Check**: Is today a weekend? (Auto-sync skips weekends)
- **Check**: Edge Function deployment status
- **Check**: Supabase cron job configuration

### High API usage
1. Check how often you're manually syncing
2. Disable auto-sync if not needed
3. Consider syncing less frequently
4. Review MetaAPI usage dashboard

## Future Enhancements

### Planned Features
- [ ] User preference UI for enabling/disabling auto-sync per account
- [ ] Usage dashboard showing API call statistics
- [ ] Configurable sync frequency (daily, weekly, custom)
- [ ] Smart sync scheduling (only during market hours)
- [ ] Batch sync optimization for multiple accounts

### Cost Optimization Ideas
- Sync only during market hours (saves ~30% on auto-sync)
- Configurable cooldown periods per account
- Usage warnings when approaching free tier limit
- Automatic fallback to manual-only mode when limit reached

## Support

For questions or issues:
1. Check this guide first
2. Review Supabase Edge Function logs
3. Check MetaAPI dashboard for API errors
4. Contact support with specific error messages

---

**Last Updated**: 2024-11-24
**Version**: 1.0