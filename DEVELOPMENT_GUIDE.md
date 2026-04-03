# TradeMind Development Guide

## Quick Start

### Starting the Development Servers

**Option 1: Using the startup script (Recommended)**
```bash
./start-dev.sh
```

This script will:
1. ✅ Clear ports 5173 and 3001
2. ✅ Start backend server (port 3001)
3. ✅ Wait for backend health check
4. ✅ Start frontend server (port 5173)
5. ✅ Show live logs from both servers

**Option 2: Using npm script**
```bash
npm run start:all
```

**Option 3: Manual startup**
```bash
# Terminal 1: Start backend
pnpm run server

# Terminal 2: Start frontend
pnpm run dev
```

### Stopping the Development Servers

**Option 1: Using the shutdown script (Recommended)**
```bash
./stop-dev.sh
```

**Option 2: Using npm script**
```bash
npm run stop:all
```

**Option 3: Manual shutdown**
```bash
# Kill processes by port
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

---

## Server Architecture

### Frontend Server (Vite)
- **Port**: 5173
- **URL**: http://localhost:5173
- **Purpose**: Serves React application with hot module replacement
- **Proxy**: Forwards `/api/*` requests to backend

### Backend Server (Express)
- **Port**: 3001
- **URL**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Purpose**: Handles MetaAPI SDK calls and Supabase authentication

### API Routes
- `POST /api/metaapi/connect` - Connect MT4/MT5 account
- `POST /api/metaapi/sync/:connectionId` - Sync trades
- `DELETE /api/metaapi/disconnect/:connectionId` - Disconnect account
- `GET /api/metaapi/status/:connectionId` - Get connection status

---

## Troubleshooting

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001` or `:::5173`

**Solution**:
```bash
# Use the stop script
./stop-dev.sh

# Or manually clear ports
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Backend Server Won't Start

**Check logs**:
```bash
cat backend.log
```

**Common issues**:
1. Missing environment variables - Check `.env` file
2. Port conflict - Run `./stop-dev.sh` first
3. Missing dependencies - Run `pnpm install`

### Frontend Server Won't Start

**Check logs**:
```bash
cat frontend.log
```

**Common issues**:
1. Port conflict - Run `./stop-dev.sh` first
2. Missing dependencies - Run `pnpm install`
3. Backend not running - Backend must start first

### API Proxy Not Working

**Error**: `Failed to load resource: the server responded with a status of 405`

**Solution**:
1. Ensure backend server is running: `curl http://localhost:3001/health`
2. Check Vite proxy configuration in `vite.config.ts`
3. Restart both servers: `./stop-dev.sh && ./start-dev.sh`

### Browser Shows MGX Domain Error

**Error**: Requests going to `https://684732-7804edd...app.mgx.dev`

**Solution**: Hard refresh browser
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`
- **Or**: Use Incognito/Private mode

---

## Development Workflow

### 1. Initial Setup
```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Make scripts executable
chmod +x start-dev.sh stop-dev.sh
```

### 2. Daily Development
```bash
# Start servers
./start-dev.sh

# Make your changes
# Servers will auto-reload on file changes

# Stop servers when done
./stop-dev.sh
```

### 3. Testing API Endpoints
```bash
# Test backend health
curl http://localhost:3001/health

# Test MetaAPI connection (with valid token)
curl -X POST http://localhost:5173/api/metaapi/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{
    "platform_type": "mt5",
    "login_number": "12345",
    "broker_server": "ICMarkets-Demo",
    "investor_password": "your_password",
    "account_id": "test-account",
    "broker_name": "IC Markets"
  }'
```

### 4. Viewing Logs
```bash
# View both logs
tail -f backend.log frontend.log

# View backend only
tail -f backend.log

# View frontend only
tail -f frontend.log
```

---

## Environment Variables

Required variables in `.env`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# MetaAPI Configuration
METAAPI_TOKEN=your_metaapi_token
```

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Start All | `npm run start:all` | Start both servers with health checks |
| Stop All | `npm run stop:all` | Stop both servers cleanly |
| Dev (Frontend) | `npm run dev` | Start frontend only |
| Server (Backend) | `npm run server` | Start backend only |
| Dev Full | `npm run dev:full` | Start both with concurrently |
| Build | `npm run build` | Build for production |
| Lint | `npm run lint` | Run ESLint |
| Preview | `npm run preview` | Preview production build |

---

## Production Deployment

### MGX App Viewer Limitation

⚠️ **Important**: MGX App Viewer only hosts static frontend files. The Express backend cannot run there.

### Deployment Options

**Option A: Deploy Backend Separately** (Recommended)
1. Deploy backend to Heroku/Railway/Render
2. Update frontend API base URL to deployed backend
3. Configure CORS for MGX domain
4. Deploy frontend to MGX App Viewer

**Option B: Use Supabase Edge Functions**
1. Convert Express routes to Supabase Edge Functions
2. Deploy functions to Supabase
3. Update frontend to call Supabase functions
4. Deploy frontend to MGX App Viewer

See `DEPLOYMENT_ANALYSIS.md` for detailed deployment guides.

---

## File Structure

```
/workspace/shadcn-ui/
├── src/                    # Frontend source code
│   ├── api/               # API client functions
│   ├── pages/             # React pages/components
│   └── lib/               # Utilities
├── server/                # Backend source code
│   ├── index.cjs          # Express server
│   ├── routes/            # API routes
│   └── services/          # MetaAPI service
├── start-dev.sh           # Startup script
├── stop-dev.sh            # Shutdown script
├── backend.log            # Backend logs
├── frontend.log           # Frontend logs
├── .env                   # Environment variables
├── vite.config.ts         # Vite configuration
└── package.json           # Dependencies & scripts
```

---

## Support

For issues or questions:
1. Check `DEPLOYMENT_ANALYSIS.md` for architecture details
2. Review logs in `backend.log` and `frontend.log`
3. Ensure all environment variables are set correctly
4. Try stopping and restarting servers

---

**Happy Coding! 🚀**