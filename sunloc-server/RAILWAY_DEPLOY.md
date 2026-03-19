# Railway Deployment Guide for Sunloc Server

## Prerequisites

1. **GitHub Account** - to store your code
2. **Railway Account** - sign up at https://railway.app
3. **Railway CLI** (optional, for local testing)

## Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Sunloc Server with PostgreSQL"
git remote add origin https://github.com/YOUR_USERNAME/sunloc-server.git
git branch -M main
git push -u origin main
```

## Step 2: Create PostgreSQL Plugin on Railway

1. Go to https://railway.app/dashboard
2. Click **"New Project"** or go to your existing project
3. Click **"Add Service"** → **"Database"** → **PostgreSQL**
4. Railway auto-generates connection credentials
5. Copy the connection string (you'll need this)

## Step 3: Deploy Server from GitHub

1. In Railway dashboard, click **"Add Service"** → **"GitHub Repo"**
2. Select your `sunloc-server` repository
3. Railway auto-detects the Dockerfile
4. Under **"Environment"**, set these variables from PostgreSQL plugin:
   - `DB_HOST` - from Railway PostgreSQL credentials
   - `DB_PORT` - usually `5432`
   - `DB_NAME` - default is `railway` (or custom name)
   - `DB_USER` - from PostgreSQL credentials
   - `DB_PASSWORD` - from PostgreSQL credentials
   - `PORT` - set to `3000` (or leave default)

## Step 4: Get Your Server URL

After deployment, Railway assigns a public URL like:
```
https://sunloc-server-production-abc123.railway.app
```

Click **"View Logs"** to confirm the server started:
```
✅ Database schema initialized
✅ Sunloc Server running on port 3000
   DB: postgres:5432/sunloc
```

## Step 5: Test the Connection

Open in your browser:
```
https://your-railway-url.railway.app/api/health
```

You should see:
```json
{
  "ok": true,
  "server": "Sunloc Integrated Server v1.0 (PostgreSQL)",
  "db": "postgres:5432/sunloc",
  "planningSavedAt": null,
  "dprRecords": 0,
  "actualsEntries": 0,
  "uptime": "5s"
}
```

## Step 6: Update Your Apps

In Planning App and DPR App, when prompted for server URL, enter:
```
https://your-railway-url.railway.app
```

## Environment Variables (Reference)

| Variable | Example | Source |
|----------|---------|--------|
| DB_HOST | `postgres.railway.internal` | Railway PostgreSQL plugin |
| DB_PORT | `5432` | PostgreSQL default |
| DB_NAME | `railway` | PostgreSQL plugin default |
| DB_USER | `postgres` | PostgreSQL plugin |
| DB_PASSWORD | `xyzABC123...` | PostgreSQL plugin (keep secret!) |
| PORT | `3000` | Railway assigns this |
| NODE_ENV | `production` | Set manually |

## Troubleshooting

**Server won't start:**
- Check logs: Railway Dashboard → View Logs
- Verify PostgreSQL plugin is running
- Check all DB_* environment variables are set correctly

**Database connection error:**
- Ensure PostgreSQL plugin is in same project
- PostgreSQL might take 30s to initialize
- Check Railway PostgreSQL logs

**Getting "Connection refused":**
- Use `postgres` hostname (Railway internal networking)
- NOT `localhost` or `127.0.0.1`

## Auto-Deploys

Every time you push to `main` branch:
```bash
git add .
git commit -m "Update feature X"
git push origin main
```

Railway automatically rebuilds and redeploys your server (zero downtime).

## Backup Your Data

Railway PostgreSQL is persistent, but for safety, export backups:

```bash
# Using Railway CLI
railway shell
pg_dump -U postgres sunloc > backup_$(date +%Y%m%d).sql
```

## Scaling & Costs

- Railway Free Tier: **$5 credit/month**
- PostgreSQL: ~$0.30/GB stored
- Node.js server: ~$0.06/GB memory
- For small factory use, this is **effectively free** (~500hrs/month)

---

## Quick Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] PostgreSQL plugin created in Railway
- [ ] Environment variables set
- [ ] Server deploys successfully
- [ ] Health endpoint returns 200 OK
- [ ] Apps configured with server URL
- [ ] Data syncing between apps confirmed
