# 🚨 Fix: Connect PostgreSQL to Your Railway Server

The error you saw means the server couldn't find the PostgreSQL database. Here's how to fix it in 3 minutes:

## Step 1: Add PostgreSQL Plugin (if not already added)

1. Go to https://railway.app/dashboard
2. Click your **powerful-commitment** project
3. Click **"+ Add Service"** (top right)
4. Select **Database** → **PostgreSQL**
5. Wait 30-60 seconds for PostgreSQL to initialize

## Step 2: Get PostgreSQL Credentials

1. In Railway, click the **postgres** service (the database)
2. Go to the **Variables** tab
3. You'll see:
   ```
   DATABASE_URL=postgres://...
   PGHOST=postgres...
   PGPORT=5432
   PGDATABASE=railway
   PGUSER=postgres
   PGPASSWORD=xxxxx
   ```

## Step 3: Set Server Environment Variables

1. Click the **sunloc-server** service (your server)
2. Go to the **Variables** tab
3. Delete any old variables
4. Add these 5 NEW variables:
   ```
   DB_HOST=postgres.railway.internal
   DB_PORT=5432
   DB_NAME=railway
   DB_USER=postgres
   DB_PASSWORD=<paste the PGPASSWORD value from step 2>
   ```

**Important:** Make sure to:
- Use `postgres.railway.internal` (not localhost)
- Copy the exact PGPASSWORD value
- Don't add extra spaces

## Step 4: Redeploy

1. Railway auto-detects the variable changes
2. Your server will restart automatically
3. Check the **Logs** tab to confirm:
   ```
   ✅ Connected to PostgreSQL
   ✅ Database schema initialized
   ✅ Sunloc Server running on port 3000
   ```

## Step 5: Test

Open in browser:
```
https://your-railway-url.railway.app/api/health
```

Should return:
```json
{
  "ok": true,
  "server": "Sunloc Integrated Server v1.0 (PostgreSQL)",
  "planningSavedAt": null,
  "dprRecords": 0,
  "actualsEntries": 0,
  "uptime": "10s"
}
```

---

## 🆘 Still Not Working?

**Check these:**

1. **Is PostgreSQL running?**
   - In Railway dashboard, click the `postgres` service
   - Check the status (should be green/healthy)
   - If not, Railway is still initializing, wait 1-2 minutes

2. **Are env variables set correctly?**
   - Click sunloc-server → Variables tab
   - Verify all 5 variables are there
   - No typos in `DB_HOST=postgres.railway.internal`

3. **Is PORT set?**
   - Don't add PORT=3000 (Railway sets this automatically)
   - If you already added it, delete it

4. **Check Logs:**
   - Click sunloc-server service
   - Go to Logs tab
   - Look for error messages
   - Post the full error if stuck

---

## Helpful Links

- Railway PostgreSQL docs: https://docs.railway.app/databases/postgresql
- Railway env variables: https://docs.railway.app/develop/variables
- Need more help? Contact Railway support in their Discord

---

**Next:** Once server is running, your Planning & DPR apps will connect automatically!
