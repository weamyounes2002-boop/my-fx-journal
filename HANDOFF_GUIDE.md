# FX Journal - Developer Handoff Guide

## Project Overview
FX Journal is a full-stack forex trading journal application with React frontend and Supabase backend.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn-ui components + Tailwind CSS
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context API
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation

### Backend
- **Platform**: Supabase (PostgreSQL database + Edge Functions)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions
- **Edge Functions**: Deno-based serverless functions

### Third-Party Integrations
- **MetaAPI**: MT4/MT5 broker integration for trade syncing
- **Stripe**: Payment processing (if enabled)
- **Google Analytics**: User analytics

## Setup Instructions

### 1. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# MetaAPI Configuration (optional)
VITE_METAAPI_TOKEN=your_metaapi_token

# Stripe Configuration (optional)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key

# Google Analytics (optional)
VITE_GA_MEASUREMENT_ID=your_ga_id
```

**IMPORTANT**: Request these credentials from the previous developer or project owner.

### 3. Supabase Setup

#### Database Migrations
Run the SQL migrations in order:
1. `supabase-schema.sql` - Main database schema
2. `supabase-mt-integration-schema.sql` - MT4/MT5 integration tables
3. `supabase-referral-schema.sql` - Referral system
4. `supabase-storage-schema.sql` - File storage policies
5. All files in `/supabase/migrations/` folder

#### Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your_project_ref

# Deploy all edge functions
supabase functions deploy connect-account
supabase functions deploy ea-webhook
supabase functions deploy metaapi-provision-account
# ... deploy other functions as needed
```

### 4. Run Development Server
```bash
pnpm run dev
# Application will run on http://localhost:5173
```

### 5. Build for Production
```bash
pnpm run build
# Output will be in /dist folder
```

## Project Structure

```
/workspace/shadcn-ui/
├── src/                          # Frontend source code
│   ├── components/              # React components
│   ├── pages/                   # Page components
│   ├── contexts/                # React contexts (Auth, etc.)
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries
│   ├── api/                     # API clients (MetaAPI, MT)
│   └── App.tsx                  # Main app component
├── supabase/                     # Backend code
│   ├── functions/               # Edge functions (serverless)
│   └── migrations/              # Database migrations
├── public/                       # Static assets
├── docs/                         # Documentation
└── [config files]               # Vite, TypeScript, Tailwind configs
```

## Key Features

1. **User Authentication**: Sign up, login, email verification
2. **Trade Journaling**: Manual trade entry and editing
3. **MT4/MT5 Integration**: Automatic trade sync via MetaAPI
4. **Analytics Dashboard**: Performance metrics and charts
5. **Goal Tracking**: Set and monitor trading goals
6. **Position Calculator**: Risk management tool
7. **AI Analysis**: Trade analysis (if enabled)
8. **Referral System**: User referral tracking
9. **Export/Import**: Trade data export

## Important Edge Functions

- `connect-account`: Connect MT4/MT5 broker accounts
- `ea-webhook`: Receive trade data from Expert Advisors
- `metaapi-provision-account`: Provision new MetaAPI accounts
- `metaapi-sync`: Sync historical trades
- `daily-auto-sync`: Automated daily trade synchronization

## Common Issues & Solutions

### Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Supabase Connection Issues
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
- Check Supabase project is active
- Verify RLS policies are correctly set

### MetaAPI Integration Issues
- Verify VITE_METAAPI_TOKEN is valid
- Check MetaAPI account status
- Review edge function logs in Supabase dashboard

## Documentation Files

- `README.md` - Project overview
- `SUPABASE_SETUP.md` - Detailed Supabase configuration
- `METAAPI_INTEGRATION.md` - MetaAPI setup guide
- `DEPLOYMENT_GUIDE.md` - Production deployment instructions
- `PERFORMANCE_OPTIMIZATION.md` - Performance tips
- Various other guides in root directory

## Support & Resources

- Supabase Docs: https://supabase.com/docs
- MetaAPI Docs: https://metaapi.cloud/docs
- Shadcn-ui: https://ui.shadcn.com
- React Docs: https://react.dev

## Next Steps

1. Set up environment variables
2. Run database migrations
3. Deploy edge functions
4. Test the application locally
5. Review existing documentation
6. Contact previous developer for any clarifications

Good luck with the development!
