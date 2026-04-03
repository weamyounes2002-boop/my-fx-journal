# Trading Journal Application

A comprehensive trading journal application with MetaAPI integration for MT4/MT5 accounts.

## Architecture

This application uses a **split architecture**:
- **Frontend**: Vite + React (runs on port 5173)
- **Backend**: Express server (runs on port 3001)
- **Proxy**: Vite proxies `/api/*` requests to the Express backend

## Prerequisites

- Node.js 18+ and pnpm
- MetaAPI account and token
- Supabase project

## Environment Setup

Create a `.env` file in the root directory:

```env
# MetaAPI Configuration
METAAPI_TOKEN=your_metaapi_token_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Installation

```bash
pnpm install
```

## Running the Application

### Development Mode (Recommended)

Run both frontend and backend servers simultaneously:

```bash
pnpm run dev:full
```

This command uses `concurrently` to start:
- Frontend dev server on http://localhost:5173
- Backend API server on http://localhost:3001

### Individual Servers

Run frontend only:
```bash
pnpm run dev
```

Run backend only:
```bash
pnpm run server
```

## MetaAPI Integration

### How It Works

1. **Backend Server** (`/workspace/shadcn-ui/server/`):
   - Handles all MetaAPI SDK operations
   - Provides REST API endpoints at `/api/metaapi/*`
   - Manages account connections, syncing, and data retrieval

2. **Frontend** (`/workspace/shadcn-ui/src/`):
   - Makes HTTP requests to backend API
   - Vite proxy forwards `/api/*` to Express server
   - No direct MetaAPI SDK usage (prevents bundle bloat)

### API Endpoints

- `POST /api/metaapi/connect` - Connect MT4/MT5 account
- `POST /api/metaapi/sync/:connectionId` - Sync trades
- `DELETE /api/metaapi/disconnect/:connectionId` - Disconnect account
- `GET /api/metaapi/status/:connectionId` - Check connection status

### Testing MetaAPI Integration

1. Start the application with `pnpm run dev:full`
2. Open browser DevTools → Network tab
3. Navigate to Accounts page
4. Click "Connect Account" and fill in MT4/MT5 credentials
5. You should see network requests to `/api/metaapi/connect`
6. After connection, click "Sync Now" to fetch trades
7. Network tab will show `/api/metaapi/sync/:id` requests

## Project Structure

```
/workspace/shadcn-ui/
├── server/                    # Express backend
│   ├── index.js              # Server entry point
│   ├── routes/
│   │   └── metaapi.js        # MetaAPI routes
│   └── services/
│       └── metaapi.js        # MetaAPI SDK wrapper
├── src/                      # React frontend
│   ├── api/
│   │   ├── metaApiClient.ts  # Frontend API client
│   │   └── mtApi.ts          # MT account operations
│   ├── pages/
│   │   └── Accounts.tsx      # Account management page
│   └── lib/
│       └── supabase.ts       # Supabase client
├── vite.config.ts            # Vite config with proxy
└── package.json              # Scripts and dependencies
```

## Build for Production

```bash
pnpm run build
```

The built files will be in the `dist/` directory.

## Deployment

### Frontend
Deploy the `dist/` folder to:
- Vercel
- Netlify
- Cloudflare Pages

### Backend
Deploy the `server/` folder to:
- Railway
- Render
- Heroku
- VPS with Node.js

Make sure to:
1. Set environment variables on both platforms
2. Update frontend API base URL to point to deployed backend
3. Configure CORS on backend to allow frontend domain

## Troubleshooting

### MetaAPI not connecting
- Check `METAAPI_TOKEN` in `.env`
- Verify backend server is running on port 3001
- Check browser console and Network tab for errors

### Port already in use
- Change ports in `server/index.js` and `vite.config.ts`
- Or kill processes using those ports

### Proxy not working
- Ensure both servers are running
- Check Vite proxy configuration in `vite.config.ts`
- Restart dev servers

## License

MIT