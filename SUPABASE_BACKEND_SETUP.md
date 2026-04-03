# Supabase Backend Setup Guide

This guide will help you set up the Supabase backend for the My FX Journal application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in the project details:
   - Name: My FX Journal
   - Database Password: (choose a strong password)
   - Region: (select closest to your users)
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Get API Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - Project URL (e.g., https://xxxxx.supabase.co)
   - anon/public key
3. Create a `.env.local` file in the project root:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Step 3: Email Verification Setup

### Enable Email Confirmations

1. Go to Supabase Dashboard → Authentication → Settings
2. Scroll to "Email Auth" section
3. Enable "Enable email confirmations"
4. Set "Confirm email" to ON
5. Configure email templates:
   - Go to Authentication → Email Templates
   - Select "Confirm signup" template
   - Customize the email template if needed
   - Set redirect URL to: `{{ .SiteURL }}/verify-email?token={{ .TokenHash }}&type=signup`
6. Save changes

### Email Provider Configuration

**For Development (Default):**
- Supabase provides a default email service for development
- Emails may be delayed or end up in spam
- Check Supabase Dashboard → Authentication → Users to manually verify emails

**For Production (Recommended):**
1. Go to Authentication → Settings → SMTP Settings
2. Configure your own SMTP provider (SendGrid, AWS SES, etc.):
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: your_sendgrid_api_key
   Sender email: noreply@yourdomain.com
   Sender name: My FX Journal
   ```
3. Enable "Enable Custom SMTP"
4. Test email delivery

### Email Template Customization

**Confirm Signup Template:**
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
```

**Variables Available:**
- `{{ .ConfirmationURL }}` - Full verification URL
- `{{ .Token }}` - Verification token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

## Step 4: Run Database Schema

1. Go to SQL Editor in Supabase Dashboard
2. Create a new query
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute the schema
5. Verify tables are created in Table Editor

## Step 5: Set Up Row Level Security (RLS)

The schema includes RLS policies, but verify they're enabled:

1. Go to Table Editor
2. For each table (profiles, accounts, trades, goals, referrals, withdrawals):
   - Click on the table
   - Go to "Policies" tab
   - Verify RLS is enabled
   - Check that policies exist

## Step 6: Configure Storage (Optional)

If using avatar uploads or trade screenshots:

1. Go to Storage in Supabase Dashboard
2. Create buckets:
   - `avatars` (public)
   - `trade-screenshots` (public)
3. Set up RLS policies for storage (see `supabase-storage-schema.sql`)

## Step 7: Test Authentication

1. Start your development server: `npm run dev`
2. Try signing up with a test email
3. Check Supabase Dashboard → Authentication → Users
4. Verify user is created
5. Check email inbox for verification email
6. Click verification link
7. Verify user can log in

## Step 8: Set Up Referral System (Optional)

1. Run `supabase-referral-schema.sql` in SQL Editor
2. Verify referral tables are created
3. Test referral code generation
4. Test withdrawal requests

## Troubleshooting

### Email Verification Not Working

**Issue:** Verification emails not received
- Check spam folder
- Verify SMTP settings in Supabase Dashboard
- Check Authentication → Logs for errors
- Manually verify email in Dashboard → Authentication → Users

**Issue:** Verification link invalid
- Check redirect URL configuration
- Verify token hasn't expired (24 hours default)
- Check browser console for errors

### RLS Policies Blocking Access

**Issue:** Can't read/write data
- Verify user is authenticated
- Check RLS policies in Table Editor
- Review policy conditions
- Check user ID matches in policies

### Connection Issues

**Issue:** Can't connect to Supabase
- Verify `.env.local` file exists
- Check API credentials are correct
- Verify project URL is correct
- Check network/firewall settings

## Security Best Practices

1. **Never commit `.env.local` to version control**
   - Add to `.gitignore`
   - Use environment variables in production

2. **Enable RLS on all tables**
   - Verify policies are restrictive
   - Test with different user accounts

3. **Use secure passwords**
   - Enforce password requirements
   - Enable password strength checks

4. **Configure rate limiting**
   - Go to Authentication → Settings
   - Set rate limits for signup/login

5. **Enable MFA (Multi-Factor Authentication)**
   - Go to Authentication → Settings
   - Enable MFA for additional security

6. **Monitor authentication logs**
   - Regularly check Authentication → Logs
   - Watch for suspicious activity

## Production Deployment

1. **Update environment variables:**
   ```env
   VITE_SUPABASE_URL=your_production_url
   VITE_SUPABASE_ANON_KEY=your_production_anon_key
   ```

2. **Configure custom domain:**
   - Go to Project Settings → API
   - Add custom domain
   - Update redirect URLs

3. **Set up email provider:**
   - Configure production SMTP
   - Test email delivery
   - Customize email templates

4. **Enable SSL:**
   - Supabase provides SSL by default
   - Verify HTTPS is enforced

5. **Set up monitoring:**
   - Enable Supabase monitoring
   - Set up alerts for errors
   - Monitor API usage

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Storage Guide](https://supabase.com/docs/guides/storage)

## Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Review browser console errors
3. Check this documentation
4. Visit Supabase Discord community
5. Search Supabase GitHub issues