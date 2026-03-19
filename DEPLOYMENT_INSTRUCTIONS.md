# Deployment Instructions - Tracking App Batch Dropdown Fix

## Issue
The `/api/batches` endpoint was returning HTML instead of JSON because the static file middleware was catching API requests before they reached the route handlers.

## Changes Made

### 1. tracking.html (Line ~735)
**Before:**
```javascript
// Also pull planning orders for batch data
const pr=await fetch(serverUrl+'/api/planning/state',{signal:AbortSignal.timeout(8000)});
if(pr.ok){
  const pj=await pr.json();
  if(pj.ok && pj.state?.orders){
    const batches = pj.state.orders.filter(o=>!o.deleted);
    // ...
  }
}
```

**After:**
```javascript
// Pull batches from dedicated /api/batches endpoint
const br=await fetch(serverUrl+'/api/batches',{signal:AbortSignal.timeout(8000)});
if(br.ok){
  const bj=await br.json();
  if(bj.ok && bj.batches){
    state.batches = bj.batches.filter(b=>!b.deleted);
  }
}
```

### 2. server.js (Line ~40 and Line ~865)
**Before:**
```javascript
// Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ... [all API routes here] ...

// Catch-all for SPA
app.get('*', (req, res) => { ... });
```

**After:**
```javascript
// Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Static file serving moved to AFTER API routes

// ... [all API routes here] ...

// ═══════════════════════════════════════════
// STATIC FILE SERVING (MUST be after all /api/* routes)
// ═══════════════════════════════════════════
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { ... });
```

## Why This Works
Express matches routes in the order they're defined:
1. **Before fix**: Static middleware catches ALL requests → `/api/batches` served as `index.html`
2. **After fix**: API routes checked first → `/api/batches` returns JSON ✅ → Static fallback only for unmatched paths

## Deployment Steps to Railway

1. **Push updated files to your Git repository:**
   ```bash
   git add sunloc-server/server.js sunloc-server/public/tracking.html
   git commit -m "Fix API route ordering: /api/batches returns JSON"
   git push
   ```

2. **Railway will auto-redeploy** (if connected to Git)
   OR
   **Manually redeploy:**
   - Go to Railway dashboard → sunloc-server service
   - Click "Redeploy" button
   - Wait for build to complete

3. **Verify the fix:**
   ```bash
   curl https://sunloc.up.railway.app/api/batches
   ```
   Should return:
   ```json
   {"ok":true,"batches":[]}
   ```
   (Empty if no Planning App data exists yet)

## Testing the Complete Flow

1. **Open Planning App** at `https://sunloc.up.railway.app/planning.html`
2. **Create a batch** (Orders → New Order → Save)
3. **Open Tracking App** at `https://sunloc.up.railway.app/tracking.html`
4. **Navigate to Label Generation**
5. **Batch dropdown** should now show the batch from step 2 ✅

## Files Modified
- `sunloc-server/server.js` — Route ordering fix
- `sunloc-server/public/tracking.html` — Fetch from dedicated `/api/batches` endpoint

## Status
- ✅ Code changes complete and tested locally
- ⏳ **Awaiting deployment to Railway**
- 🔄 Once deployed, batches will load correctly
