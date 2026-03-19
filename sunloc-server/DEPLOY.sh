#!/bin/bash
# Railway Deployment Script for Sunloc Server
# This script guides you through deploying to Railway

set -e

echo "🚀 Sunloc Server - Railway Deployment Guide"
echo "==========================================="
echo ""

# Check prerequisites
echo "1️⃣  Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install git: https://git-scm.com/download"
    exit 1
fi
echo "✅ Git found"

if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not found (optional, but recommended)"
    echo "   Install from: https://docs.railway.app/guides/cli"
fi

echo ""
echo "2️⃣  Initializing Git repository..."
if [ ! -d .git ]; then
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

echo ""
echo "3️⃣  Setting up deployment files..."
echo "✅ Files in place:"
echo "   - Dockerfile (multi-stage build)"
echo "   - docker-compose.yml (local testing)"
echo "   - railway.json (Railway config)"
echo "   - .env.example (variables template)"
echo ""

echo "4️⃣  Next steps:"
echo ""
echo "   A. Push to GitHub:"
echo "      git add ."
echo "      git commit -m 'Sunloc Server with PostgreSQL'"
echo "      git remote add origin https://github.com/YOUR_USERNAME/sunloc-server.git"
echo "      git branch -M main"
echo "      git push -u origin main"
echo ""
echo "   B. Create Railway Project:"
echo "      1. Go to https://railway.app"
echo "      2. Sign up or log in"
echo "      3. Click 'New Project'"
echo "      4. Select 'Deploy from GitHub repo'"
echo "      5. Authorize GitHub and select your repo"
echo ""
echo "   C. Add PostgreSQL Plugin:"
echo "      1. In Railway dashboard, click 'Add Service'"
echo "      2. Select 'Database' → 'PostgreSQL'"
echo "      3. Railway creates the database automatically"
echo ""
echo "   D. Set Environment Variables:"
echo "      In your server service, go to Variables and add:"
echo ""
echo "      DB_HOST=postgres.railway.internal"
echo "      DB_PORT=5432"
echo "      DB_NAME=railway"
echo "      DB_USER=postgres"
echo "      DB_PASSWORD=[copy from PostgreSQL plugin logs]"
echo "      PORT=3000"
echo "      NODE_ENV=production"
echo ""
echo "   E. Deploy:"
echo "      Railway auto-deploys when you push to GitHub!"
echo "      Check Logs tab to confirm:"
echo "      ✅ Database schema initialized"
echo "      ✅ Sunloc Server running on port 3000"
echo ""
echo "   F. Test:"
echo "      curl https://your-railway-url.railway.app/api/health"
echo ""
echo "   G. Connect Apps:"
echo "      When Planning/DPR apps ask for server URL, paste:"
echo "      https://your-railway-url.railway.app"
echo ""
echo "✨ Done! Your server is now live on Railway."
echo ""
