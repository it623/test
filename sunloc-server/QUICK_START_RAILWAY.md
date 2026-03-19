# 🚀 Quick Start: Deploy Sunloc to Railway in 5 Minutes

## Step 1: Prepare Your Repository

```bash
cd sunloc-server

# Initialize git if not done
git init
git add .
git commit -m "Sunloc Server with PostgreSQL - Ready for Railway"

# Create GitHub repo (if needed)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/sunloc-server.git
git branch -M main
git push -u origin main
```

## Step 2: Create Railway Account

1. Go to **https://railway.app**
2. Click **Sign Up** (or Sign In if you have account)
3. Choose **GitHub** for easy authentication

## Step 3: Create New Railway Project

1. Click **"New Project"** in Railway dashboard
2. Select **"Deploy from GitHub repo"**
3. Authorize GitHub access
4. Select your `sunloc-server` repository
5. Click **Deploy**

Railway auto-detects `Dockerfile` and starts building.

## Step 4: Add PostgreSQL Database

1. While server is building, click **"Add Service"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway auto-generates credentials and URL

PostgreSQL will be ready in ~30 seconds.

## Step 5: Set Environment Variables

In Railway dashboard for your **sunloc-server** service:

1. Click **"Variables"** tab
2. Add these from PostgreSQL plugin credentials:

```
DB_HOST=postgres.railway.internal
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=<copy from PostgreSQL Variables>
PORT=3000
NODE_ENV=production
```

## Step 6: Verify Deployment

1. Check **"Logs"** tab for:
   ```
   ✅ Database schema initialized
   ✅ Sunloc Server running on port 3000
      DB: postgres:5432/sunloc
   ```

2. Click **"View Logs"** or **"Visit"** button to get your URL

3. Test the health endpoint:
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

## Step 7: Update Your Apps

In **Planning App** and **DPR App**:

When prompted for server URL, enter:
```
https://your-railway-url.railway.app
```

(Get the exact URL from Railway dashboard)

---

## ✅ You're Done!

Your server is now live and automatically deploys on every `git push`.

### What Happens Next:

- Every time you push to GitHub (`git push`), Railway auto-rebuilds and redeploys
- Zero downtime deployments
- Data persists in PostgreSQL
- Logs available in Railway dashboard 24/7

### Test It Out:

```bash
# Make a change to server.js
# Commit and push
git add .
git commit -m "Update feature"
git push

# Railway redeploys automatically
# Check Logs tab for deploy progress
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Server won't start | Check Logs tab → Verify all DB_* variables set |
| Connection refused | Use `postgres.railway.internal` hostname |
| PostgreSQL not ready | Wait 30s, Railway initializes on first deploy |
| Health check failing | Ensure PORT=3000 in variables |

---

## 📚 More Details

- **Full Deployment Guide:** See `RAILWAY_DEPLOY.md`
- **Local Testing:** Run `docker compose up -d`
- **API Documentation:** See `README.md`
- **Architecture:** Check `DEPLOYMENT_SUMMARY.md`

---

**🎉 Congratulations! Your Sunloc Server is live on Railway.**

Your planning, DPR, and tracking apps can now sync data in the cloud!
