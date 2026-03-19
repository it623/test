# 🎯 Railway Setup - Visual Step-by-Step Guide

## The Problem
Your server crashed because it couldn't connect to PostgreSQL. **PostgreSQL isn't connected yet.**

## The Solution (7 Steps - 5 Minutes)

---

### Step 1: Open Railway Dashboard
Go to: **https://railway.app/dashboard**

---

### Step 2: Select Your Project
Click: **powerful-commitment**

You should see your services in the dashboard.

---

### Step 3: Check for PostgreSQL Service

**Look on the left side** - do you see a "postgres" service?

#### If YES → Skip to Step 5

#### If NO → Add PostgreSQL:
1. Click **"+ Add Service"** (top right area)
2. Click **Database** section
3. Select **PostgreSQL**
4. Wait 60 seconds (Railway initializes the database)
5. You'll see a new "postgres" service appear

---

### Step 4: Wait for PostgreSQL Ready
- PostgreSQL service should have a **green checkmark**
- Status should say "Running"
- If it says "Initializing", wait another 30 seconds

---

### Step 5: Get PostgreSQL Credentials

1. Click the **postgres** service (in the left panel)
2. Go to the **Variables** tab
3. You'll see a list of variables:

```
DATABASE_URL=postgres://...
PGDATABASE=railway
PGHOST=postgres.railway.internal  ← COPY THIS
PGPASSWORD=xyzABC123...           ← COPY THIS TOO
PGPORT=5432
PGUSER=postgres
```

**Copy and save these values somewhere (notepad):**
- `PGHOST` value
- `PGPORT` value  
- `PGDATABASE` value
- `PGUSER` value
- `PGPASSWORD` value

---

### Step 6: Set Server Environment Variables

1. Click the **sunloc-server** service (in the left panel)
2. Go to the **Variables** tab
3. **Clear any existing variables** (click X on each one)
4. Click **"+ Add Variable"** and add these 6 new ones:

| Variable Name | Value |
|---------------|-------|
| `DB_HOST` | `postgres.railway.internal` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `railway` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | *(paste PGPASSWORD from step 5)* |
| `NODE_ENV` | `production` |

**DO NOT add PORT=3000** (Railway sets this automatically)

After adding all 6, click **Save** (or they auto-save)

---

### Step 7: Wait for Auto-Redeploy

1. Railway auto-detects variable changes
2. Server **automatically redeploys**
3. Go to the **Logs** tab of your server
4. Watch for these lines:

```
🔧 Database Configuration:
   Host: postgres.railway.internal
   Port: 5432
   Name: railway
   User: postgres
✅ Connected to PostgreSQL
✅ Database schema initialized
✅ Sunloc Server running on port 3000
```

If you see all 3 ✅ messages → **SUCCESS!**

---

### Step 8: Test Your Server

1. Click your **sunloc-server** service
2. Click **View Logs** or the **Visit** button to get your URL
3. In a browser, go to:

```
https://YOUR-RAILWAY-URL.railway.app/api/health
```

You should see:
```json
{
  "ok": true,
  "server": "Sunloc Integrated Server v1.0 (PostgreSQL)",
  "db": "postgres:5432/railway",
  "planningSavedAt": null,
  "dprRecords": 0,
  "actualsEntries": 0,
  "uptime": "10s"
}
```

---

## ✅ Success Checklist

- [ ] PostgreSQL service is running (green checkmark)
- [ ] All 6 environment variables set in server service
- [ ] `DB_HOST=postgres.railway.internal` (not localhost)
- [ ] Server shows ✅ Connected to PostgreSQL in logs
- [ ] Health endpoint returns 200 OK
- [ ] JSON response shows `"ok": true`

---

## 🆘 Troubleshooting

**Q: I don't see a "postgres" service**
A: You need to add it. Click "+ Add Service" → Database → PostgreSQL

**Q: PostgreSQL says "Initializing" for too long**
A: Railway sometimes takes 1-2 minutes. Reload the page or wait another minute.

**Q: Server still crashing**
A: Check these:
1. All 6 variables are set (don't miss DB_PASSWORD)
2. DB_HOST is exactly `postgres.railway.internal` (no typos)
3. PGPASSWORD was copied completely (it's usually long)
4. No extra spaces in variable values

**Q: Health endpoint not working**
A: Get the correct URL:
- Click sunloc-server service
- Look for "Visit" button or check Logs for the URL
- Make sure to add `/api/health` to the end

**Q: PostgreSQL connection refused**
A: Wait 30-60 seconds. PostgreSQL might still be initializing. Refresh logs.

---

## Next Steps (After Success)

Once the server is running:

1. **Update your Planning App** with the server URL
2. **Update your DPR App** with the server URL
3. **Test data syncing** between apps
4. **Monitor logs** for any errors

---

**You're almost there! Just follow the 7 steps above. 🚀**
