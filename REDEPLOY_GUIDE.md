# Quick Redeploy Guide - Batch Dropdown Fix

## What Was Fixed
✅ Tracking App batch dropdown now fetches from `/api/batches` endpoint  
✅ Express route ordering fixed - API routes now checked before static files  

## Current Status
- Files are modified locally in `./sunloc-server/`
- Changes NOT yet deployed to Railway
- Old code still running on `https://sunloc.up.railway.app`

## Option 1: Git Push (Recommended - if Railway is linked to GitHub)

```bash
cd sunloc-server
git add server.js public/tracking.html
git commit -m "Fix: Move static file serving after API routes to prevent /api/batches HTML return"
git push origin main
# Railway will auto-redeploy
```

## Option 2: Manual Redeploy via Railway Dashboard

1. **Go to Railway Dashboard**
   - https://railway.app/dashboard

2. **Select your project** (Sunloc)

3. **Click the Sunloc Server service**

4. **Find the "Build & Deploy" section** → Click the **Redeploy** button

5. **Wait** for the deployment to complete (2-3 minutes)
   - You'll see "Building..." → "Deploying..." → "Running"

## Option 3: Push via Railway CLI

```bash
npm install -g @railway/cli
railway login
railway link  # Link to your project/service
railway up    # Deploy
```

## Verification After Deployment

### Test 1: Health Check
```bash
curl https://sunloc.up.railway.app/api/health
```
Expected: JSON response with `"ok":true`

### Test 2: Batches Endpoint
```bash
curl https://sunloc.up.railway.app/api/batches
```
Expected: `{"ok":true,"batches":[]}` or `{"ok":true,"batches":[{...}]}`

### Test 3: Browser Test
1. Open `https://sunloc.up.railway.app/planning.html`
2. Create a new Order/Batch
3. Open `https://sunloc.up.railway.app/tracking.html`
4. Go to "Label Generation"
5. Dropdown should show the batch you just created ✅

## Files Changed
```
sunloc-server/
├── server.js (Line 40-42, Line 865-872) ← Route ordering fix
└── public/tracking.html (Line ~735) ← Fetch from /api/batches
```

## Expected Behavior AFTER Deployment

**Before Fix:**
- Tracking App batch dropdown was empty
- `/api/batches` returned HTML instead of JSON

**After Fix:**
- Tracking App batch dropdown populated from `/api/batches` endpoint
- `/api/batches` returns JSON with batch list
- All three apps (Planning, DPR, Tracking) data synced correctly

---

## Need Help?

If deployment doesn't work:
1. Check Railway logs in dashboard
2. Verify PostgreSQL is still running (should show green)
3. Clear browser cache and reload tracking.html
4. Ensure all environment variables are still set (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
