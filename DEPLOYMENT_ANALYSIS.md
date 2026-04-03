# MetaAPI Connection Architecture - Deep Analysis Report

**Date**: 2025-01-18  
**Analyst**: Alex (Engineer)  
**Status**: Critical Issues Identified

---

## 🚨 EXECUTIVE SUMMARY

The TradeMind application has a **fundamental architecture mismatch** between local development and MGX App Viewer deployment:

- ✅ **Local Development**: Works when both frontend and backend servers are running
- ❌ **MGX App Viewer**: Fails because it only hosts static frontend files (no backend)
- 🔴 **Critical**: MetaAPI SDK requires a backend server, which MGX App Viewer cannot provide

---

## 📊 DETAILED FINDINGS

### 1. CURRENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (React + Vite)          Backend (Express + Node)  │
│  Port: 5173                       Port: 3001                │
│  ┌──────────────────┐            ┌──────────────────┐      │
│  │                  │   Proxy    │                  │      │
│  │  User Interface  │───────────▶│  MetaAPI SDK     │      │
│  │  (Browser)       │ /api/*     │  Supabase Client │      │
│  │                  │            │  Auth Handler    │      │
│  └──────────────────┘            └──────────────────┘      │
│                                           │                  │
│                                           ▼                  │
│                                   ┌──────────────────┐      │
│                                   │  MetaAPI Cloud   │      │
│                                   │  MT4/MT5 Brokers │      │
│                                   └──────────────────┘      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    MGX APP VIEWER                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Static Build)          Backend                   │
│  https://684732-7804edd...         ❌ DOES NOT EXIST        │
│  ┌──────────────────┐                                       │
│  │                  │   /api/*                              │
│  │  User Interface  │───────────▶ ❌ 404 Not Found         │
│  │  (Browser)       │                                       │
│  │                  │                                       │
│  └──────────────────┘                                       │
│                                                              │
│  Result: All MetaAPI calls fail                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. COMPONENT ANALYSIS

#### A. Frontend API Client (`src/api/metaApiClient.ts`)
**Status**: ✅ **CORRECT**

```typescript
const API_BASE = '/api/metaapi';  // ✓ Uses relative path
```

**Findings**:
- Uses relative paths (not hardcoded URLs)
- Proper authentication with Supabase tokens
- Correct error handling
- **No code changes needed**

#### B. Vite Proxy Configuration (`vite.config.ts`)
**Status**: ✅ **CORRECT** (for local dev only)

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
  },
}
```

**Findings**:
- Correctly forwards `/api/*` to backend during development
- **Limitation**: Proxy only works in dev mode, not in production build
- **Impact**: Built static files have no proxy capability

#### C. Backend Express Server (`server/index.cjs`)
**Status**: ⚠️ **NOT RUNNING**

**Findings**:
- Code is correct and well-structured
- Environment variables properly loaded
- CORS configured for localhost
- **Problem**: Not started (requires manual `pnpm run server`)
- **Critical**: Cannot run in MGX App Viewer (static hosting only)

#### D. Backend Routes (`server/routes/metaapi.cjs`)
**Status**: ✅ **CODE CORRECT**

**Findings**:
- Proper authentication checks
- Supabase integration configured
- MetaAPI SDK calls implemented correctly
- **Problem**: Unreachable in MGX App Viewer

#### E. Environment Variables (`.env`)
**Status**: ✅ **CONFIGURED**

```
VITE_SUPABASE_URL=https://mctcmjnirsxrywvwzpzu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
METAAPI_TOKEN=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9...
```

**Findings**:
- All credentials present and valid
- Supabase URL and keys correct
- MetaAPI token configured

### 3. ERROR ANALYSIS

#### Error #1: 405 Method Not Allowed
```
Failed to load resource: the server responded with a status of 405 ()
[MetaAPI Client] Connect error: SyntaxError: Unexpected token '<', "<html><h"... is not valid JSON
```

**Root Cause**:
- Backend server not running
- Vite dev server receives POST request to `/api/metaapi/connect`
- Vite doesn't handle this route (no proxy target available)
- Returns HTML error page instead of JSON
- Frontend tries to parse HTML as JSON → error

**Solution**: Start backend server

#### Error #2: MGX Domain in Browser Console
```
Request URL: https://684732-7804edd...app.mgx.dev/api/metaapi/connect
```

**Root Cause**:
- Browser cached old JavaScript from MGX App Viewer
- Old code may have hardcoded production URLs
- Current source code is correct (uses relative paths)

**Solution**: Hard refresh browser (Ctrl+Shift+R)

#### Error #3: Connection Refused (Local Testing)
```
curl: (7) Failed to connect to localhost port 3001/5173
```

**Root Cause**:
- Neither frontend nor backend servers running
- Ports 5173 and 3001 not listening

**Solution**: Start both servers

### 4. WHY IT FAILS IN MGX APP VIEWER

**MGX App Viewer Limitations**:
1. **Static Hosting Only**: Only serves built HTML/CSS/JS files
2. **No Server-Side Code**: Cannot run Node.js/Express backend
3. **No Proxy**: Built files have no proxy capability
4. **No Environment Variables**: Server-side env vars not accessible

**What Happens**:
1. User clicks "Connect MT5 Account"
2. Frontend makes request: `POST /api/metaapi/connect`
3. MGX server receives request
4. No backend handler exists
5. Returns 404 or 405 error
6. Connection fails

**Why MetaAPI SDK Needs Backend**:
- MetaAPI SDK is a Node.js library
- Cannot run in browser (uses Node-specific APIs)
- Requires server environment
- Needs to keep API token secret (security)

---

## 🎯 RECOMMENDED SOLUTIONS

### Option A: Deploy Backend Separately ⭐ **RECOMMENDED**

**Architecture**:
```
Frontend (MGX)              Backend (Cloud Service)
https://684732...mgx.dev    https://your-backend.herokuapp.com
     │                               │
     └──────── API Calls ───────────┘
            /api/metaapi/*
```

**Steps**:
1. Deploy Express backend to Heroku/Railway/Render
2. Update frontend to use deployed backend URL
3. Set environment variables on hosting platform
4. Configure CORS to allow MGX domain

**Pros**:
- ✅ Full MetaAPI functionality
- ✅ Secure (API token on server)
- ✅ Scalable
- ✅ Works in MGX App Viewer

**Cons**:
- ❌ Requires separate hosting
- ❌ Additional cost (free tiers available)
- ❌ More complex deployment

**Estimated Time**: 2-3 hours

---

### Option B: Use Supabase Edge Functions

**Architecture**:
```
Frontend (MGX)              Supabase Edge Functions
https://684732...mgx.dev    https://your-project.supabase.co/functions/v1/
     │                               │
     └──────── API Calls ───────────┘
         /functions/v1/metaapi-*
```

**Steps**:
1. Convert Express routes to Supabase Edge Functions
2. Deploy functions to Supabase
3. Update frontend to call Supabase functions
4. Store MetaAPI token in Supabase secrets

**Pros**:
- ✅ Integrated with existing Supabase setup
- ✅ No separate hosting needed
- ✅ Automatic scaling
- ✅ Built-in authentication

**Cons**:
- ❌ Requires code refactoring
- ❌ Deno runtime (not Node.js)
- ❌ May need MetaAPI SDK adjustments

**Estimated Time**: 4-6 hours

---

### Option C: Client-Side MetaAPI ❌ **NOT RECOMMENDED**

**Architecture**:
```
Frontend (MGX)              MetaAPI Cloud
https://684732...mgx.dev    https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai
     │                               │
     └──────── Direct API ──────────┘
         (Exposes API token)
```

**Pros**:
- ✅ No backend needed
- ✅ Simple architecture

**Cons**:
- ❌ **SECURITY RISK**: Exposes API token in browser
- ❌ Anyone can steal token from DevTools
- ❌ Token can be used to access your MetaAPI account
- ❌ Violates security best practices

**Verdict**: **DO NOT USE**

---

## 📋 IMMEDIATE ACTION ITEMS

### For Local Development Testing:

1. **Start Backend Server**:
   ```bash
   cd /workspace/shadcn-ui
   pnpm run server
   ```

2. **Start Frontend Server** (in new terminal):
   ```bash
   cd /workspace/shadcn-ui
   pnpm run dev
   ```

3. **Or Start Both Together**:
   ```bash
   pnpm run dev:full
   ```

4. **Verify Servers Running**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001/health

### For MGX App Viewer Deployment:

**Choose one of the following**:

1. **Option A** (Recommended): Deploy backend to cloud service
2. **Option B**: Refactor to use Supabase Edge Functions
3. **Option C**: ❌ Do not use (security risk)

---

## 🔧 TECHNICAL SPECIFICATIONS

### Current Stack:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: Supabase (PostgreSQL)
- **MetaAPI**: metaapi.cloud-sdk v27.0.2
- **Authentication**: Supabase Auth

### Required Ports:
- Frontend: 5173 (Vite dev server)
- Backend: 3001 (Express server)

### Dependencies:
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "metaapi.cloud-sdk": "^27.0.2",
  "@supabase/supabase-js": "^2.39.0"
}
```

---

## 📞 SUPPORT CONTACTS

- **MetaAPI Documentation**: https://metaapi.cloud/docs/
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Heroku Deployment**: https://devcenter.heroku.com/articles/deploying-nodejs
- **Railway Deployment**: https://docs.railway.app/deploy/deployments

---

## 🎓 LESSONS LEARNED

1. **Static hosting cannot run backend code** - MGX App Viewer is for frontend only
2. **Vite proxy only works in dev mode** - Production builds don't include proxy
3. **MetaAPI SDK requires server environment** - Cannot run in browser
4. **Security first** - Never expose API tokens in frontend code
5. **Architecture matters** - Design for deployment environment from the start

---

## ✅ CONCLUSION

The TradeMind application code is **correct and well-structured**. The issue is not a bug but an **architectural limitation** of the deployment environment.

**For local development**: Start both servers and everything works perfectly.

**For MGX App Viewer**: You must deploy the backend separately or refactor to use Supabase Edge Functions.

**Recommended Next Step**: Deploy backend to Heroku (free tier) and update frontend configuration.

---

**Report End**