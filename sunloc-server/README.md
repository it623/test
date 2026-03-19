# Sunloc Integrated Server

Shared backend server for Planning App + DPR App + Tracking App.

**Stack:** Node.js + Express + PostgreSQL

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ (for local dev)

### Run Locally

```bash
# 1. Clone and navigate
git clone <your-repo>
cd sunloc-server

# 2. Start with Docker Compose (includes PostgreSQL)
docker compose up -d

# 3. Test the server
curl http://localhost:3000/api/health

# 4. Access the server
# Server: http://localhost:3000
# PostgreSQL: localhost:5432
```

You should see:
```json
{
  "ok": true,
  "server": "Sunloc Integrated Server v1.0 (PostgreSQL)",
  "planningSavedAt": null,
  "dprRecords": 0,
  "actualsEntries": 0,
  "uptime": "2s"
}
```

### Stop the Server

```bash
docker compose down
```

## Production Deployment (Railway.app)

See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for step-by-step instructions.

**TL;DR:**
1. Push code to GitHub
2. Create PostgreSQL plugin in Railway
3. Connect repo to Railway with environment variables
4. Railway auto-deploys on every `git push`

## API Routes

### Planning App

- `GET /api/planning/state` - Fetch full planning state with live actuals
- `POST /api/planning/state` - Save planning state
- `GET /api/orders/active` - List all active orders
- `GET /api/orders/machine/:machineId` - Orders for a specific machine

### DPR App

- `GET /api/dpr/:floor/:date` - Fetch DPR record for a floor/date
- `POST /api/dpr/save` - Save DPR record + extract actuals
- `GET /api/dpr/dates/:floor` - List all DPR dates for a floor
- `GET /api/actuals/machine/:machineId` - Machine actuals history (90 days)
- `GET /api/actuals/order/:orderId` - Order actuals across all machines

### Tracking App

- `GET /api/tracking/state` - Full tracking state
- `POST /api/tracking/labels` - Save tracking labels
- `POST /api/tracking/scan` - Record scan event (IN/OUT)
- `POST /api/tracking/wastage` - Log salvage/remelt
- `POST /api/tracking/stage-close` - Close stage for batch
- `POST /api/tracking/dispatch-record` - Log dispatch
- `GET /api/tracking/batch-summary/:batchNumber` - Batch WIP summary
- `GET /api/tracking/wip-summary` - Overall WIP across all batches

### Health

- `GET /api/health` - Server status + database info

## Environment Variables

```bash
# Database (required)
DB_HOST=localhost          # PostgreSQL hostname
DB_PORT=5432              # PostgreSQL port
DB_NAME=sunloc            # Database name
DB_USER=postgres          # Database user
DB_PASSWORD=postgres      # Database password

# Server (optional)
PORT=3000                 # Server port (default: 3000)
NODE_ENV=production       # Environment (default: production)
```

For Railway, these are set via environment variables in the dashboard.

## File Structure

```
sunloc-server/
├── server.js             # Main Express server (PostgreSQL)
├── package.json          # Dependencies
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Local PostgreSQL + server setup
├── railway.json          # Railway deployment config
├── .env.example          # Environment variables template
├── RAILWAY_DEPLOY.md     # Detailed Railway deployment guide
├── public/               # Static frontend files (SPA)
│   └── index.html
└── README.md             # This file
```

## Database Schema

### Core Tables
- `planning_state` - Full JSON state for planning app
- `dpr_records` - DPR data per floor/date
- `production_actuals` - Actuals bridge table

### Tracking Tables
- `tracking_labels` - QR labels generated per batch
- `tracking_scans` - Scan events (IN/OUT per dept)
- `tracking_stage_closure` - Stage completion tracking
- `tracking_wastage` - Salvage/remelt logs
- `tracking_dispatch_records` - Dispatch events
- `tracking_alerts` - 48h stuck-in-stage alerts

All data is persisted in PostgreSQL with ACID guarantees.

## Data Sync

**Planning App ↔ Server:**
- Planning state (orders, machines, dispatch plans) saved as JSON
- Enriched with live production actuals from DPR

**DPR App ↔ Server:**
- DPR records (per floor/date) saved as JSON
- Actuals extracted and normalized into `production_actuals` table
- Synced back to planning app's order actuals

**Tracking App ↔ Server:**
- Labels generated, scans recorded per department
- WIP calculated from scan IN/OUT counts
- Dispatch updates sync back to planning app

## Troubleshooting

### Server won't start locally
```bash
# Check Docker is running
docker ps

# Check logs
docker logs sunloc-server

# Verify PostgreSQL is healthy
docker logs sunloc-postgres
```

### Connection refused
```bash
# Ensure compose is up
docker compose ps

# Restart
docker compose down
docker compose up -d
```

### Database error on startup
```bash
# PostgreSQL might need time to initialize (first run)
# Wait 10-15 seconds and check logs again
docker compose logs postgres
```

### Port already in use
```bash
# Change ports in docker-compose.yml:
# postgres: change 5432:5432 to 15432:5432
# server: change 3000:3000 to 13000:3000
```

## Performance Tips

- All frequently-queried fields (machine_id, batch_number, date) are indexed
- JSONB columns enable efficient querying of nested state
- Connection pooling limits (20 concurrent) prevent resource exhaustion
- Health checks (30s interval) detect stale connections

## Backup & Restore

### Local PostgreSQL
```bash
# Backup
docker exec sunloc-postgres pg_dump -U postgres sunloc > backup.sql

# Restore
docker exec -i sunloc-postgres psql -U postgres sunloc < backup.sql
```

### Railway PostgreSQL
Use Railway's built-in backup feature or export via CLI:
```bash
railway shell postgres
pg_dump -U postgres railroad > backup.sql
```

## Monitoring

Check server health via:
```bash
curl http://localhost:3000/api/health
```

Or from Railway dashboard: **View Logs** tab shows real-time output.

## Support

For issues:
1. Check logs: `docker compose logs -f sunloc-server`
2. Verify database connection: `docker compose exec postgres psql -U postgres -d sunloc -c "SELECT 1"`
3. Test API: `curl http://localhost:3000/api/health`

---

**Version:** 1.0.0 (PostgreSQL)  
**Last Updated:** 2024-03-18
