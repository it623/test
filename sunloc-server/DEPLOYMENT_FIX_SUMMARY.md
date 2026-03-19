# 🎯 Your Deployment Issue & The Fix

## What Happened
Your server deployed to Railway but **crashed immediately** because PostgreSQL wasn't connected.

Error: `connect ECONNREFUSED ::1:5432`

This means: "Can't connect to database on localhost port 5432"

## Why It Happened
Railway's services don't run on `localhost`. They run on Railway's internal network.

Your server was looking for PostgreSQL on:
- ❌ `localhost` (your computer)
- ❌ `127.0.0.1` (local machine)

But it should look for PostgreSQL on:
- ✅ `postgres.railway.internal` (Railway's internal network)

## The Fix

You need to tell your server where to find PostgreSQL by setting **environment variables in Railway**.

### 3-Step Fix:

#### Step 1: Add PostgreSQL Plugin (if missing)
```
Railway Dashboard → Your Project → "+ Add Service" → Database → PostgreSQL
```

#### Step 2: Get PostgreSQL Credentials
```
Click: postgres service → Variables tab
Copy: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
```

#### Step 3: Set Server Variables
```
Click: sunloc-server service → Variables tab
Add these 6 variables:
  DB_HOST=postgres.railway.internal
  DB_PORT=5432
  DB_NAME=railway
  DB_USER=postgres
  DB_PASSWORD=<paste from step 2>
  NODE_ENV=production
```

**That's it!** Railway auto-redeploys when you save variables.

---

## What to Look For After Setting Variables

Check the **Logs** tab of your server. You should see:

```
✅ Connected to PostgreSQL
✅ Database schema initialized
✅ Sunloc Server running on port 3000
```

If you see these 3 lines, you're done! 🎉

---

## Files I Created to Help

| File | Purpose |
|------|---------|
| `FIX_POSTGRESQL_RAILWAY.md` | Quick 3-minute fix guide |
| `RAILWAY_VISUAL_GUIDE.md` | Step-by-step with pictures/descriptions |
| `RAILWAY_SETUP.sh` | Script showing all steps |
| `server.js` | Updated with better error messages |

---

## Still Not Working?

**Most Common Issues:**

1. **PostgreSQL not added yet**
   - Go to Railway dashboard
   - Click "+ Add Service" → Database → PostgreSQL
   - Wait 60 seconds

2. **Variables not saved**
   - Click sunloc-server → Variables tab
   - Make sure all 6 variables are there
   - They should have checkmarks

3. **Typo in DB_HOST**
   - Must be exactly: `postgres.railway.internal`
   - NOT `localhost`, NOT `127.0.0.1`, NOT `postgres`

4. **Missing DB_PASSWORD**
   - Must copy the ENTIRE PGPASSWORD value from PostgreSQL
   - It's usually long and has letters/numbers/symbols

---

## Next Command

Push the updated error-handling code:

```bash
git add .
git commit -m "Add Railway PostgreSQL connection guides"
git push
```

Railway auto-redeploys, then set the variables (step 3 above).

---

## You've Got This! 💪

The code is ready. Just need to connect PostgreSQL in Railway and set 6 environment variables. 5 minutes and you're done.

**Read:** `RAILWAY_VISUAL_GUIDE.md` for step-by-step with descriptions.
