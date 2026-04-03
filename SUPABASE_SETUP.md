# Supabase Setup Guide for My FX Journal

This guide will walk you through setting up Supabase as the backend for your My FX Journal application.

## Prerequisites

- A Supabase account (free tier available at https://supabase.com)
- Node.js and npm/pnpm installed
- Your My FX Journal application code

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign up or log in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: My FX Journal (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Start with the Free tier
4. Click "Create new project"
5. Wait 2-3 minutes for your project to be provisioned

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, click on the "Settings" icon (gear icon) in the left sidebar
2. Click on "API" under Project Settings
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`
4. Keep this page open - you'll need these values in the next step

## Step 3: Configure Environment Variables

1. In your project root directory (`/workspace/shadcn-ui`), create a `.env` file
2. Copy the contents from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and replace the placeholder values with your actual Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run Database Migrations

1. In your Supabase project dashboard, click on the "SQL Editor" icon in the left sidebar
2. Click "New query"
3. Open the `supabase-schema.sql` file from your project root
4. Copy the entire contents of the file
5. Paste it into the SQL Editor
6. Click "Run" (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned" - this means all tables were created successfully

## Step 5: Verify Database Setup

1. Click on the "Table Editor" icon in the left sidebar
2. You should see the following tables:
   - `profiles`
   - `accounts`
   - `trades`
   - `strategies`
   - `goals`
   - `trading_rules`
3. Click on each table to verify the columns are created correctly

## Step 6: Configure Authentication

1. Click on the "Authentication" icon in the left sidebar
2. Click on "Providers"
3. Make sure "Email" is enabled (it should be by default)
4. Optionally, configure email templates:
   - Click on "Email Templates"
   - Customize the "Confirm signup" and "Reset password" templates if desired

## Step 7: Test Your Application

1. Start your development server:
   ```bash
   pnpm run dev
   ```

2. Open your browser and navigate to `http://localhost:5173`

3. Test the authentication flow:
   - Click "Get Started" or "Sign Up"
   - Create a new account with your email and password
   - Check your email for the confirmation link (if email confirmation is enabled)
   - Try logging in with your credentials
   - You should be redirected to the dashboard

4. Test data persistence:
   - Add a new trade in the Trade Journal
   - Refresh the page
   - The trade should still be there (not disappear like with mock data)

## Step 8: Verify Row Level Security (RLS)

1. Create a second test account
2. Log in with the second account
3. Verify that you cannot see the first account's data
4. This confirms RLS is working correctly

## Troubleshooting

### "Invalid API key" error
- Double-check that you copied the correct anon key from Supabase
- Make sure there are no extra spaces in your `.env` file
- Restart your dev server after changing `.env`

### "relation does not exist" error
- Make sure you ran the entire `supabase-schema.sql` file
- Check the SQL Editor for any error messages
- Verify all tables were created in the Table Editor

### Authentication not working
- Check that Email provider is enabled in Authentication > Providers
- Verify your email confirmation settings
- Check the browser console for error messages

### Data not persisting
- Verify your `.env` file has the correct credentials
- Check that RLS policies are set up correctly
- Look for errors in the browser console

## Security Best Practices

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **Use Row Level Security (RLS)** - already configured in the schema
3. **Rotate your API keys** if they're ever exposed
4. **Enable email confirmation** for production (optional for development)
5. **Set up proper CORS policies** in Supabase dashboard if needed

## Next Steps

Now that Supabase is set up, you can:

1. **Customize the schema** - Add more fields to tables as needed
2. **Add more authentication methods** - Google, GitHub, etc.
3. **Set up storage** - For user avatars or trade screenshots
4. **Enable real-time subscriptions** - For live data updates
5. **Add database functions** - For complex queries or calculations

## Support

- **Supabase Documentation**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **My FX Journal Issues**: Create an issue in your repository

## Cost Monitoring

Keep an eye on your Supabase usage:
1. Go to Settings > Usage in your Supabase dashboard
2. Monitor:
   - Database size
   - API requests
   - Bandwidth
   - Storage

The free tier is generous, but if you exceed limits, you'll need to upgrade to Pro ($25/month).

---

**Congratulations!** 🎉 Your My FX Journal application now has a production-ready backend with Supabase!