# Trading Journal App

A React + TypeScript trading journal application for MT4/MT5 traders.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Radix UI (shadcn/ui components)
- **Backend/DB**: Supabase (Auth, PostgreSQL, Edge Functions)
- **State**: TanStack Query (React Query)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Rich Text**: Tiptap editor
- **Package Manager**: pnpm

## Project Structure

```
/               - Root (all source files at root level, no src/ dir)
/api/           - Frontend API clients for Supabase Edge Functions
/components/    - React components (ui/, feature components)
/contexts/      - React Context providers (AuthContext)
/hooks/         - Custom React hooks
/lib/           - Core utilities and Supabase client
/pages/         - Main application views
/services/      - Service layer
/utils/         - Helper utilities
/functions/     - Supabase Edge Functions (Deno/TypeScript)
/migrations/    - SQL migration files
```

## Development

```bash
pnpm install
pnpm run dev   # Starts on port 5000
```

## Configuration

- Vite dev server: port 5000, host 0.0.0.0, allowedHosts: 'all'
- Deployment: static site (pnpm build → dist/)
- Supabase config in `lib/supabase.ts` — requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars

## Required Environment Variables

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_METAAPI_TOKEN` - MetaAPI token (optional, for MT4/MT5 integration)
