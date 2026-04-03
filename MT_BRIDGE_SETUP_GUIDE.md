# MetaTrader 4/5 Bridge Setup Guide

This guide will help you set up the MT4/MT5 Expert Advisors to automatically sync your trading data to the web application.

## Prerequisites

- MetaTrader 4 or MetaTrader 5 installed on your PC
- Active trading account (demo or live) with investor password
- Web application account with Supabase configured
- Internet connection

---

## Part 1: Web Application Setup

### Step 1: Create MT Connection in Web App

1. Log in to your web application
2. Navigate to **Accounts** page
3. Click **"Add Account"** button
4. Fill in the form:
   - **Account Name**: Give it a descriptive name (e.g., "My MT5 Demo")
   - **Broker**: Select your broker platform (MT4 or MT5)
   - **Account Number**: Your MT login number
   - **Currency**: Your account currency (USD, EUR, etc.)

5. After creating the account, you'll receive a **Connection ID**
6. **IMPORTANT**: Copy and save this Connection ID - you'll need it for the EA setup

---

## Part 2: MetaTrader Setup

### Step 2: Install the Expert Advisor

#### For MT4:
1. Open MetaTrader 4
2. Click **File → Open Data Folder**
3. Navigate to **MQL4 → Experts** folder
4. Copy the `MT4_Bridge.mq4` file into this folder
5. Restart MetaTrader 4
6. The EA should now appear in the **Navigator** panel under **Expert Advisors**

#### For MT5:
1. Open MetaTrader 5
2. Click **File → Open Data Folder**
3. Navigate to **MQL5 → Experts** folder
4. Copy the `MT5_Bridge.mq5` file into this folder
5. Restart MetaTrader 5
6. The EA should now appear in the **Navigator** panel under **Expert Advisors**

### Step 3: Enable WebRequest for Your API URL

**CRITICAL STEP**: MetaTrader blocks external URLs by default. You must whitelist your API URL.

1. In MetaTrader, go to **Tools → Options**
2. Click on the **Expert Advisors** tab
3. Check the box: **"Allow WebRequest for listed URL"**
4. Add your API URL to the list:
   ```
   https://your-app-url.com/api/mt/sync-trades
   ```
   Replace `your-app-url.com` with your actual web application domain

5. Click **OK** to save

**Note**: Without this step, the EA will not be able to send data to your web app!

### Step 4: Configure the Expert Advisor

1. In the **Navigator** panel, find the EA (MT4_Bridge or MT5_Bridge)
2. Drag and drop it onto any chart
3. A settings window will appear with these parameters:

#### Required Parameters:

- **API_URL**: Your web application API endpoint
  ```
  https://your-app-url.com/api/mt/sync-trades
  ```

- **CONNECTION_ID**: The Connection ID you copied from the web app in Step 1
  ```
  abc123-def456-ghi789
  ```

- **SYNC_INTERVAL**: How often to sync (in seconds)
  - Default: 300 (5 minutes)
  - Minimum: 60 (1 minute)
  - Recommended: 300-600 seconds

- **ENABLE_LOGGING**: Enable detailed logging
  - Default: true
  - Set to false to reduce log output

4. Click **OK** to start the EA

### Step 5: Verify the EA is Running

1. Check the **Experts** tab at the bottom of MetaTrader
2. You should see initialization messages:
   ```
   [MT4 Bridge] Initialized successfully
   [MT4 Bridge] Account: 12345678
   [MT4 Bridge] Server: BrokerName-Demo
   [MT4 Bridge] Sync interval: 300 seconds
   [MT4 Bridge] Starting sync...
   ```

3. The EA will perform an initial sync immediately
4. After that, it will sync automatically every SYNC_INTERVAL seconds

---

## Part 3: Verification

### Step 6: Check Sync Status in Web App

1. Go back to your web application
2. Navigate to **Accounts** page
3. You should see your account with updated status:
   - **Status**: Connected (green)
   - **Balance**: Updated from MT
   - **Last Sync**: Recent timestamp

4. Navigate to **Trade Journal** page
5. Your trades should now appear automatically

### Step 7: Monitor Sync Logs

In MetaTrader, check the **Experts** tab for sync messages:

**Successful sync:**
```
[MT4 Bridge] Starting sync...
[MT4 Bridge] Built payload with 15 trades
[MT4 Bridge] HTTP Response Code: 200
[MT4 Bridge] Sync completed successfully at 2024-01-15 10:30:00
```

**Failed sync:**
```
[MT4 Bridge] ERROR: WebRequest failed. Error code: 4060
[MT4 Bridge] ERROR: URL not allowed. Add https://your-app.com to allowed URLs
```

---

## Troubleshooting

### Problem: EA shows "URL not allowed" error

**Solution**: 
- Go to **Tools → Options → Expert Advisors**
- Add your API URL to the WebRequest whitelist
- Restart the EA

### Problem: EA shows "CONNECTION_ID is not set" error

**Solution**:
- Get the Connection ID from your web app
- Right-click the EA on the chart → **Expert Advisors → Properties**
- Enter the CONNECTION_ID parameter
- Click OK

### Problem: Trades not appearing in web app

**Solution**:
1. Check the Experts tab for error messages
2. Verify your internet connection
3. Check that your web app is online
4. Verify the API_URL is correct
5. Check the web app's sync logs for errors

### Problem: EA stops working after MetaTrader restart

**Solution**:
- The EA should auto-start if it was running before
- If not, drag and drop it onto a chart again
- Make sure "Allow live trading" is enabled in Tools → Options

### Problem: Sync is too slow or too fast

**Solution**:
- Adjust the SYNC_INTERVAL parameter
- Minimum: 60 seconds (1 minute)
- Recommended: 300 seconds (5 minutes)
- Maximum: 3600 seconds (1 hour)

---

## Security Best Practices

1. **Use Investor Password Only**
   - Never use your master password
   - Investor password is read-only
   - Cannot place or modify trades

2. **Secure Your Connection ID**
   - Don't share your Connection ID
   - It's unique to your account
   - Treat it like a password

3. **Use HTTPS Only**
   - Always use HTTPS URLs (not HTTP)
   - Ensures encrypted data transmission

4. **Monitor Sync Activity**
   - Regularly check sync logs
   - Verify data accuracy in web app
   - Report any suspicious activity

5. **Keep EA Updated**
   - Check for EA updates periodically
   - Update to latest version for security patches

---

## Advanced Configuration

### Multiple Accounts

You can run multiple EAs for different accounts:

1. Create separate accounts in the web app
2. Get unique Connection IDs for each
3. Attach separate EA instances to different charts
4. Configure each with its own CONNECTION_ID

### Custom Sync Intervals

Adjust based on your trading style:

- **Scalpers**: 60-120 seconds (more frequent)
- **Day Traders**: 300-600 seconds (moderate)
- **Swing Traders**: 900-1800 seconds (less frequent)

### Logging Configuration

- **Enable logging** during initial setup for troubleshooting
- **Disable logging** after confirming everything works
- Reduces log file size and improves performance

---

## Data Synced

The EA syncs the following data:

### Account Information:
- Balance
- Equity
- Margin
- Free Margin
- Margin Level

### Trade Data:
- Ticket number
- Symbol (currency pair)
- Type (buy/sell)
- Lot size
- Open price
- Close price (if closed)
- Open time
- Close time (if closed)
- Profit/Loss
- Commission
- Swap
- Stop Loss
- Take Profit

### Sync Frequency:
- Automatic sync every SYNC_INTERVAL seconds
- Manual sync on EA restart
- Real-time for open positions

---

## Support

If you encounter issues:

1. Check the **Experts** tab in MetaTrader for error messages
2. Verify all settings are correct
3. Check your internet connection
4. Ensure the web app is accessible
5. Review this guide's troubleshooting section

For additional help:
- Check the web app documentation
- Contact support through the web app
- Review MetaTrader logs in the **Journal** tab

---

## FAQ

**Q: Will this EA place trades automatically?**
A: No, this EA only reads and syncs data. It cannot place or modify trades.

**Q: Does it work with demo accounts?**
A: Yes, it works with both demo and live accounts.

**Q: How much data does it use?**
A: Very minimal - typically less than 1MB per day for active traders.

**Q: Can I use it on multiple computers?**
A: Yes, but use the same CONNECTION_ID on all computers for the same account.

**Q: What happens if my internet disconnects?**
A: The EA will retry on the next sync interval when connection is restored.

**Q: Is my data secure?**
A: Yes, data is encrypted during transmission (HTTPS) and stored securely in your database.

**Q: Can I stop the EA temporarily?**
A: Yes, right-click the EA on the chart and select "Remove".

**Q: Will it sync historical trades?**
A: Yes, it syncs the last 90 days of trade history on first sync.

---

## Version History

**v1.00** (Current)
- Initial release
- MT4 and MT5 support
- Automatic sync with configurable intervals
- Account info and trade history sync
- Error handling and logging
- WebRequest support

---

**Last Updated**: January 2024