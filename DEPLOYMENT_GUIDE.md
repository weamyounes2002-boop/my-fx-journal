# MyFXJournal - Account Connection Deployment Guide

## Overview
This guide explains how to deploy the new account connection system that allows users to connect their MT4/MT5 accounts.

## Prerequisites
- Supabase CLI installed
- Supabase project configured
- MetaAPI token (already provided)

## Step 1: Set MetaAPI Token as Supabase Secret

The MetaAPI token needs to be stored as a secret in your Supabase project:

```bash
# Set the MetaAPI token as a secret
supabase secrets set METAAPI_TOKEN="eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI4NzQ0NjMxZjBiY2UzMjBiOTMxZDYwMjI1NDgwNDMxNiIsImFjY2Vzc1J1bGVzIjpbeyJpZCI6Im1ldGFhcGktcmVzdC1hcGkiLCJtZXRob2RzIjpbIm1ldGFhcGktYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6Im1ldGFhcGktcnBjLWFwaSIsIm1ldGhvZHMiOlsibWV0YWFwaS1hcGk6d3M6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6Im1ldGFhcGktcmVhbC10aW1lLXN0cmVhbWluZy1hcGkiLCJtZXRob2RzIjpbIm1ldGFhcGktYXBpOndzOnB1YmxpYzoqOioiXSwicm9sZXMiOlsicmVhZGVyIl0sInJlc291cmNlcyI6WyIqOiRVU0VSX0lEJDoqIl19LHsiaWQiOiJtZXRhc3RhdHMtYXBpIiwibWV0aG9kcyI6WyJtZXRhc3RhdHMtYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX1dLCJpZ25vcmVSYXRlTGltaXRzIjpmYWxzZSwidG9rZW5JZCI6IjIwMjEwMjEzIiwiaW1wZXJzb25hdGVkIjpmYWxzZSwicmVhbFVzZXJJZCI6Ijg3NDQ2MzFmMGJjZTMyMGI5MzFkNjAyMjU0ODA0MzE2IiwiaWF0IjoxNzY0MDI1ODE1fQ.OPAG1wHyWiq8VbGffxrwS6fM4wkoavE5tJ7T5vnXxER1ff2oyt2LQ1UIVvLplv8vr-1t7pSLJi_tOgxmyztHFGCZ4IhMOC74L-w8t54El1bQHxNlNzb4fdBJeK5OZyXRR6-ZI7YvOX49M75l0lpuE78TLwIkvVwJtXc4miS7VJCtVytK6Rf6mBEY8YheF7ZIVm7uXi3tvHZqc-8s-t1Smm0v0waBkzhs9Ftp6D9lpj5f6VXUjQ5rL_1--mlYeCKEIHbypDVnzvIesPybIcjP11DUhRq-6syUFx_8gpUHuQPUlHimz932smK1u_WmN719Dh1LlXGSRPQ4J21zgZzBIxda6Kgcu6rhO9gkfduDc0EXLTumko7iGE6oBmyL0X0nNQcOribuM1uM74kSfnPNbc4NgnnwxHAw_vsqO9L7vEWLIH4oghV5Rqqk2tsaPIauG5qqHdKPCdtWP0UwdKySmGUlSXcAQpoPxv50J_e9khrLCKw1UJHNtgHf_BLrRiczIlNll-7SLgwGqAwSXEzKuKcJSvN966nSW2k-lH0oJvd1-BqQkagHfjJQcT7h1Ak0jPHwzp41l-kj8Q5Yr0N8t_2gR3PG3Ac7dhuox6aaPRN6hsyk5nLO9OxZnrVYaAb9O4VimK4Dy_mUoYp921PnxctfMX3akys-A49m7098sr4"
```

## Step 2: Apply Database Migration

Run the migration to add the new columns to the `mt_connections` table:

```bash
# From your project root directory
cd /workspace/shadcn-ui

# Apply the migration
supabase db push
```

This will add:
- `investor_password_encrypted` column (for storing encrypted passwords)
- `platform` column (to distinguish MT4 vs MT5)

## Step 3: Deploy Edge Functions

Deploy the new Edge Function that handles account connection:

```bash
# Deploy the connect-account function
supabase functions deploy connect-account

# Also deploy the connect-existing function if not already deployed
supabase functions deploy metaapi-connect-existing
```

## Step 4: Test the Connection Flow

1. **Open MyFXJournal** in your browser
2. **Go to Accounts page**
3. **Click "Connect Account"**
4. **Fill in the form:**
   - Platform: MT4 or MT5
   - Broker Server: e.g., "ICMarkets-Demo"
   - Login ID: Your MT4/MT5 login number
   - Investor Password: Your read-only password
5. **Click "Save & Continue"**
6. **Follow the instructions:**
   - Go to https://app.metaapi.cloud/
   - Sign up/log in
   - Add your account with the same credentials
   - Copy the MetaAPI Account ID
7. **Paste the MetaAPI Account ID** back into MyFXJournal
8. **Click "Complete Connection"**

## How It Works

### Two-Step Process

**Step 1: Save Credentials**
- User enters broker credentials in MyFXJournal
- System creates account record in `accounts` table
- Credentials are encrypted and stored in `mt_connections` table
- User receives instructions to create MetaAPI account

**Step 2: Link MetaAPI Account**
- User creates account on MetaAPI manually
- User copies MetaAPI Account ID
- User pastes ID back into MyFXJournal
- System links the MetaAPI account to the local account
- Historical data sync begins automatically

### Why Two Steps?

The MetaAPI token provided has **read-only permissions** (`"roles": ["reader"]`), which means:
- ✅ Can read existing accounts
- ✅ Can fetch trading data
- ❌ Cannot create new accounts (403 Forbidden error)

Therefore, users must create their MetaAPI accounts manually, then link them back to MyFXJournal.

## Architecture

```
User Input (Credentials)
    ↓
MyFXJournal Frontend
    ↓
Supabase Edge Function: connect-account
    ↓
Store in mt_connections table (encrypted)
    ↓
User creates MetaAPI account manually
    ↓
User provides MetaAPI Account ID
    ↓
Supabase Edge Function: metaapi-connect-existing
    ↓
Link accounts & start data sync
```

## Security Notes

1. **Investor Password Only**: System only accepts investor (read-only) passwords
2. **Encryption**: Passwords are encrypted with base64 (can be upgraded to stronger encryption)
3. **No Trading Access**: Cannot place trades or modify accounts
4. **User Control**: Users can delete accounts and data at any time

## Troubleshooting

### "Failed to save credentials"
- Check Supabase connection
- Verify user is authenticated
- Check browser console for errors

### "Failed to connect MetaAPI account"
- Verify MetaAPI Account ID is correct
- Check that MetaAPI account is deployed
- Ensure credentials match between MyFXJournal and MetaAPI

### "403 Forbidden" when trying to auto-provision
- This is expected with read-only token
- Users must create MetaAPI accounts manually
- Follow the two-step process outlined above

## Next Steps

After successful deployment:
1. Test the connection flow with a demo account
2. Monitor Edge Function logs for any errors
3. Verify data sync is working correctly
4. Check Analytics page for synced trades

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check browser console for frontend errors
3. Verify database schema is up to date
4. Ensure MetaAPI token is set correctly