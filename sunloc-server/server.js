/**
 * SUNLOC INTEGRATED SERVER - PostgreSQL Edition
 * Shared backend for Planning App + DPR App
 * Stack: Node.js + Express + PostgreSQL
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_VERSION = '3.0-BATCH-SYNC-FINAL-v3';

// ─── Database Setup ────────────────────────────────────────────
console.log('🔧 Database Configuration:');
console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`   Port: ${process.env.DB_PORT || 5432}`);
console.log(`   Name: ${process.env.DB_NAME || 'sunloc'}`);
console.log(`   User: ${process.env.DB_USER || 'postgres'}`);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sunloc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err.message);
});

// ═══════════════════════════════════════════════════════
// CRITICAL: API Routes MUST come before static files
// ═══════════════════════════════════════════════════════

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// BLOCK static middleware from catching /api/* paths
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/test-')) {
    return next(); // Skip static file serving, go to routes
  }
  next();
});

// ─── Create Tables Function ────────────────────────────────────
async function createTables() {
  console.log('⏳ Connecting to PostgreSQL...');
  
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
  } catch (err) {
    console.error('❌ CRITICAL: Cannot connect to PostgreSQL');
    console.error('Error:', err.message);
    process.exit(1);
  }

  try {
    // Create all tables separately (simpler, more reliable)
    console.log('📋 Creating database tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS planning_state (
        id SERIAL PRIMARY KEY,
        state_json JSONB NOT NULL,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ planning_state');

    await client.query(`
      CREATE TABLE IF NOT EXISTS dpr_records (
        id SERIAL PRIMARY KEY,
        floor TEXT NOT NULL,
        date TEXT NOT NULL,
        data_json JSONB NOT NULL,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(floor, date)
      )
    `);
    console.log('  ✅ dpr_records');

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_actuals (
        id SERIAL PRIMARY KEY,
        order_id TEXT,
        batch_number TEXT,
        machine_id TEXT NOT NULL,
        date TEXT NOT NULL,
        shift TEXT NOT NULL,
        run_index INTEGER DEFAULT 0,
        qty_lakhs DECIMAL DEFAULT 0,
        floor TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(machine_id, date, shift, run_index)
      )
    `);
    console.log('  ✅ production_actuals');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_labels (
        id TEXT PRIMARY KEY,
        batch_number TEXT NOT NULL,
        label_number INTEGER NOT NULL,
        size TEXT NOT NULL,
        qty DECIMAL NOT NULL,
        is_partial INTEGER DEFAULT 0,
        is_orange INTEGER DEFAULT 0,
        parent_label_id TEXT,
        customer TEXT,
        colour TEXT,
        pc_code TEXT,
        po_number TEXT,
        machine_id TEXT,
        printing_matter TEXT,
        generated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        printed INTEGER DEFAULT 0,
        printed_at TIMESTAMP,
        voided INTEGER DEFAULT 0,
        void_reason TEXT,
        voided_at TIMESTAMP,
        voided_by TEXT,
        qr_data TEXT,
        UNIQUE(batch_number, label_number, is_orange)
      )
    `);
    console.log('  ✅ tracking_labels');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_scans (
        id TEXT PRIMARY KEY,
        label_id TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        dept TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('in','out')),
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        operator TEXT,
        size TEXT,
        qty DECIMAL
      )
    `);
    console.log('  ✅ tracking_scans');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_stage_closure (
        id TEXT PRIMARY KEY,
        batch_number TEXT NOT NULL,
        dept TEXT NOT NULL,
        closed INTEGER DEFAULT 1,
        closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_by TEXT,
        UNIQUE(batch_number, dept)
      )
    `);
    console.log('  ✅ tracking_stage_closure');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_wastage (
        id TEXT PRIMARY KEY,
        batch_number TEXT NOT NULL,
        dept TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('salvage','remelt')),
        qty DECIMAL NOT NULL,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        by TEXT
      )
    `);
    console.log('  ✅ tracking_wastage');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_dispatch_records (
        id TEXT PRIMARY KEY,
        batch_number TEXT NOT NULL,
        customer TEXT,
        qty DECIMAL NOT NULL,
        boxes INTEGER NOT NULL,
        vehicle_no TEXT,
        invoice_no TEXT,
        remarks TEXT,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        by TEXT
      )
    `);
    console.log('  ✅ tracking_dispatch_records');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_alerts (
        id TEXT PRIMARY KEY,
        label_id TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        dept TEXT NOT NULL,
        scan_in_ts TIMESTAMP NOT NULL,
        hours_stuck DECIMAL,
        resolved INTEGER DEFAULT 0,
        UNIQUE(label_id, dept)
      )
    `);
    console.log('  ✅ tracking_alerts');

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_actuals_order ON production_actuals(order_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_actuals_batch ON production_actuals(batch_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_actuals_machine ON production_actuals(machine_id, date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dpr_date ON dpr_records(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scans_label ON tracking_scans(label_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scans_batch ON tracking_scans(batch_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scans_dept ON tracking_scans(dept, type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_labels_batch ON tracking_labels(batch_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_closure_batch ON tracking_stage_closure(batch_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wastage_batch ON tracking_wastage(batch_number, dept)`);

    console.log('✅ All database tables and indexes created successfully');
  } catch (err) {
    console.error('❌ Database table creation error:', err.message);
    console.error('Details:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

// ─── Helper: get latest planning state ────────────────────────
async function getPlanningState() {
  try {
    const result = await pool.query(
      'SELECT state_json FROM planning_state ORDER BY id DESC LIMIT 1'
    );
    if (!result.rows.length) {
      return { orders: [], printOrders: [], dispatchPlans: [], dailyPrinting: [], machineMaster: [], printMachineMaster: [], packSizes: {} };
    }
    return result.rows[0].state_json;
  } catch (err) {
    console.error('getPlanningState error:', err);
    return {};
  }
}

// ─── Helper: get active orders for a machine ──────────────────
async function getActiveOrdersForMachine(machineId) {
  const state = await getPlanningState();
  const orders = state.orders || [];
  return orders.filter(o =>
    o.machineId === machineId &&
    o.status !== 'closed' &&
    !o.deleted
  ).map(o => ({
    id: o.id,
    batchNumber: o.batchNumber || '',
    poNumber: o.poNumber || '',
    customer: o.customer || '',
    size: o.size || '',
    colour: o.colour || '',
    qty: o.qty || 0,
    isPrinted: o.isPrinted || false,
    status: o.status || 'pending',
    zone: o.zone || '',
  }));
}

// ─── Helper: get total actuals for an order ────────────────────
async function getOrderActuals(orderId, batchNumber) {
  try {
    let result;
    if (orderId) {
      result = await pool.query(
        'SELECT SUM(qty_lakhs) as total FROM production_actuals WHERE order_id = $1',
        [orderId]
      );
      if (!result.rows[0].total && batchNumber) {
        result = await pool.query(
          'SELECT SUM(qty_lakhs) as total FROM production_actuals WHERE batch_number = $1',
          [batchNumber]
        );
      }
    } else if (batchNumber) {
      result = await pool.query(
        'SELECT SUM(qty_lakhs) as total FROM production_actuals WHERE batch_number = $1',
        [batchNumber]
      );
    }
    return result?.rows[0]?.total || 0;
  } catch (err) {
    console.error('getOrderActuals error:', err);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// PLANNING APP ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/planning/state', async (req, res) => {
  try {
    const state = await getPlanningState();
    // Orders already have actualProd from previous DPR sync
    const savedResult = await pool.query(
      'SELECT saved_at FROM planning_state ORDER BY id DESC LIMIT 1'
    );
    res.json({
      ok: true,
      state,
      savedAt: savedResult.rows[0]?.saved_at || null
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/planning/state', async (req, res) => {
  try {
    const { state } = req.body;
    if (!state) return res.status(400).json({ ok: false, error: 'No state provided' });

    const existing = await pool.query('SELECT id FROM planning_state LIMIT 1');
    if (existing.rows.length) {
      await pool.query(
        'UPDATE planning_state SET state_json = $1, saved_at = CURRENT_TIMESTAMP WHERE id = $2',
        [state, existing.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO planning_state (state_json) VALUES ($1)',
        [state]
      );
    }

    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/orders/machine/:machineId', async (req, res) => {
  try {
    const orders = await getActiveOrdersForMachine(req.params.machineId);
    res.json({ ok: true, orders });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/orders/active', async (req, res) => {
  try {
    const state = await getPlanningState();
    const orders = (state.orders || [])
      .filter(o => o.status !== 'closed' && !o.deleted)
      .map(o => ({
        id: o.id,
        batchNumber: o.batchNumber || '',
        poNumber: o.poNumber || '',
        customer: o.customer || '',
        machineId: o.machineId || '',
        size: o.size || '',
        colour: o.colour || '',
        qty: o.qty || 0,
        actualQty: o.actualQty || 0,
        status: o.status || 'pending',
      }));
    res.json({ ok: true, orders });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// TRACKING APP ROUTE - Get Batches from Planning Orders
// ═══════════════════════════════════════════════════════════════

app.get('/api/batches', async (req, res) => {
  try {
    const state = await getPlanningState();
    const orders = state.orders || [];
    
    // Extract unique batch numbers from orders
    const batches = orders
      .filter(o => o.batchNumber && o.status !== 'closed' && !o.deleted)
      .map(o => ({
        batchNumber: o.batchNumber,
        orderId: o.id,
        customer: o.customer || '',
        qty: o.qty || 0,
        size: o.size || '',
        colour: o.colour || '',
        status: o.status || 'pending'
      }));
    
    // Remove duplicates
    const uniqueBatches = [];
    const seen = new Set();
    for (const batch of batches) {
      if (!seen.has(batch.batchNumber)) {
        seen.add(batch.batchNumber);
        uniqueBatches.push(batch);
      }
    }
    
    res.json({ ok: true, batches: uniqueBatches });
  } catch (err) {
    console.error('ERROR in /api/batches:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DEBUG: Test route
app.get('/test-batches', async (req, res) => {
  res.json({ ok: true, message: 'Test route works', timestamp: new Date().toISOString() });
});;

// ═══════════════════════════════════════════════════════════════
// DPR APP ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/dpr/:floor/:date', async (req, res) => {
  try {
    const { floor, date } = req.params;
    const result = await pool.query(
      'SELECT data_json, saved_at FROM dpr_records WHERE floor = $1 AND date = $2',
      [floor, date]
    );
    if (!result.rows.length) return res.json({ ok: true, data: null });
    res.json({ ok: true, data: result.rows[0].data_json, savedAt: result.rows[0].saved_at });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/dpr/save', async (req, res) => {
  const client = await pool.connect();
  try {
    const { floor, date, data, actuals } = req.body;
    if (!floor || !date || !data) return res.status(400).json({ ok: false, error: 'Missing floor, date, or data' });

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO dpr_records (floor, date, data_json)
       VALUES ($1, $2, $3)
       ON CONFLICT(floor, date) DO UPDATE SET data_json = excluded.data_json, saved_at = CURRENT_TIMESTAMP`,
      [floor, date, data]
    );

    await client.query(
      'DELETE FROM production_actuals WHERE floor = $1 AND date = $2',
      [floor, date]
    );

    if (actuals && actuals.length > 0) {
      for (const a of actuals) {
        if (!a.qty || a.qty <= 0) continue;
        await client.query(
          `INSERT INTO production_actuals (order_id, batch_number, machine_id, date, shift, run_index, qty_lakhs, floor)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT(machine_id, date, shift, run_index) DO UPDATE SET
             order_id = excluded.order_id,
             batch_number = excluded.batch_number,
             qty_lakhs = excluded.qty_lakhs,
             synced_at = CURRENT_TIMESTAMP`,
          [a.orderId || null, a.batchNumber || null, a.machineId, date, a.shift, a.runIndex || 0, a.qty, a.floor || floor]
        );
      }
    } else {
      const shifts = data.shifts || {};
      for (const [shiftName, shiftData] of Object.entries(shifts)) {
        if (!shiftData.machines) continue;
        for (const [machineId, machineData] of Object.entries(shiftData.machines)) {
          const runs = machineData.runs || [{ orderId: machineData.orderId, batchNumber: machineData.batchNumber, qty: machineData.prod }];
          for (let ri = 0; ri < runs.length; ri++) {
            const run = runs[ri];
            const qty = parseFloat(run.qty) || 0;
            if (qty <= 0) continue;
            await client.query(
              `INSERT INTO production_actuals (order_id, batch_number, machine_id, date, shift, run_index, qty_lakhs, floor)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT(machine_id, date, shift, run_index) DO UPDATE SET
                 order_id = excluded.order_id,
                 batch_number = excluded.batch_number,
                 qty_lakhs = excluded.qty_lakhs,
                 synced_at = CURRENT_TIMESTAMP`,
              [run.orderId || null, run.batchNumber || null, machineId, date, shiftName, ri, qty, floor]
            );
          }
        }
      }
    }

    try {
      const dprData = data;
      const machineProduction = {};
      
      if (dprData.shifts) {
        for (const [shiftName, shiftData] of Object.entries(dprData.shifts)) {
          if (shiftData.machines) {
            for (const [machineId, machineData] of Object.entries(shiftData.machines)) {
              if (!machineProduction[machineId]) machineProduction[machineId] = 0;
              const prod = parseFloat(machineData.prod) || 0;
              machineProduction[machineId] += prod;
            }
          }
        }
      }
      
      console.log('DPR Sync: Machine Production =', machineProduction);
      
      const planningStateResult = await client.query(
        'SELECT id, state_json FROM planning_state ORDER BY id DESC LIMIT 1'
      );
      
      if (planningStateResult.rows.length > 0) {
        const state = planningStateResult.rows[0].state_json;
        if (state && state.orders) {
          let changed = false;
          for (const ord of state.orders) {
            if (ord.machineId && machineProduction[ord.machineId] !== undefined) {
              const totalMachineProd = machineProduction[ord.machineId];
              ord.actualProd = parseFloat(totalMachineProd.toFixed(3));
              ord.actualQty = parseFloat(totalMachineProd.toFixed(3));
              if (ord.actualProd > 0 && ord.status === 'pending') ord.status = 'running';
              changed = true;
              console.log(`Updated order ${ord.id}: actualProd = ${ord.actualProd}`);
            }
          }
          
          if (changed) {
            await client.query(
              'UPDATE planning_state SET state_json = $1, saved_at = CURRENT_TIMESTAMP WHERE id = $2',
              [state, planningStateResult.rows[0].id]
            );
            console.log('Updated Planning state with DPR production');
          }
        }
      }
    } catch (syncErr) {
      console.error('Planning actualProd sync error:', syncErr.message);
    }

    await client.query('COMMIT');
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/dpr/dates/:floor', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT date FROM dpr_records WHERE floor = $1 ORDER BY date DESC',
      [req.params.floor]
    );
    res.json({ ok: true, dates: result.rows.map(r => r.date) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/actuals/machine/:machineId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT date, shift, qty_lakhs, order_id, batch_number
       FROM production_actuals
       WHERE machine_id = $1
       ORDER BY date DESC, shift
       LIMIT 90`,
      [req.params.machineId]
    );
    res.json({ ok: true, actuals: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/actuals/order/:orderId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT date, shift, qty_lakhs, machine_id
       FROM production_actuals
       WHERE order_id = $1 OR batch_number = $1
       ORDER BY date, shift`,
      [req.params.orderId]
    );
    const total = result.rows.reduce((s, r) => s + parseFloat(r.qty_lakhs || 0), 0);
    res.json({ ok: true, actuals: result.rows, total });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK + INFO
// ═══════════════════════════════════════════════════════════════

app.get('/api/health', async (req, res) => {
  try {
    const planningResult = await pool.query('SELECT saved_at FROM planning_state ORDER BY id DESC LIMIT 1');
    const dprResult = await pool.query('SELECT COUNT(*) as c FROM dpr_records');
    const actualsResult = await pool.query('SELECT COUNT(*) as c FROM production_actuals');

    res.json({
      ok: true,
      server: `Sunloc Integrated Server v1.0 (PostgreSQL) - Build ${SERVER_VERSION}`,
      db: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'sunloc'}`,
      planningSavedAt: planningResult.rows[0]?.saved_at || null,
      dprRecords: parseInt(dprResult.rows[0].c),
      actualsEntries: parseInt(actualsResult.rows[0].c),
      uptime: Math.floor(process.uptime()) + 's',
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      server: 'Sunloc Server v1.0 (PostgreSQL - DB CONNECTION ERROR)'
    });
  }
});


app.get('/api/tracking/state', async (req, res) => {
  try {
    const labelsResult = await pool.query('SELECT * FROM tracking_labels ORDER BY batch_number, label_number');
    const scansResult = await pool.query('SELECT * FROM tracking_scans ORDER BY ts DESC LIMIT 5000');
    const closureResult = await pool.query('SELECT * FROM tracking_stage_closure');
    const wastageResult = await pool.query('SELECT * FROM tracking_wastage');
    const dispatchResult = await pool.query('SELECT * FROM tracking_dispatch_records ORDER BY ts DESC');
    const alertsResult = await pool.query('SELECT * FROM tracking_alerts WHERE resolved = 0');

    const mapLabel = l => ({
      id: l.id, batchNumber: l.batch_number, labelNumber: l.label_number, size: l.size, qty: l.qty,
      isPartial: !!l.is_partial, isOrange: !!l.is_orange, parentLabelId: l.parent_label_id,
      customer: l.customer, colour: l.colour, pcCode: l.pc_code, poNumber: l.po_number,
      machineId: l.machine_id, printingMatter: l.printing_matter, generated: l.generated,
      printed: !!l.printed, printedAt: l.printed_at, voided: !!l.voided, voidReason: l.void_reason,
      voidedAt: l.voided_at, voidedBy: l.voided_by, qrData: l.qr_data
    });

    res.json({
      ok: true,
      state: {
        labels: labelsResult.rows.map(mapLabel),
        scans: scansResult.rows,
        stageClosure: closureResult.rows,
        wastage: wastageResult.rows,
        dispatchRecs: dispatchResult.rows,
        alerts: alertsResult.rows
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/labels', async (req, res) => {
  try {
    const { labels } = req.body;
    if (!labels?.length) return res.status(400).json({ ok: false, error: 'No labels' });

    for (const l of labels) {
      await pool.query(
        `INSERT INTO tracking_labels (id,batch_number,label_number,size,qty,is_partial,is_orange,parent_label_id,customer,colour,pc_code,po_number,machine_id,printing_matter,generated,qr_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT(id) DO UPDATE SET batch_number=excluded.batch_number, label_number=excluded.label_number, size=excluded.size, qty=excluded.qty`,
        [l.id, l.batchNumber, l.labelNumber, l.size, l.qty, l.isPartial ? 1 : 0, l.isOrange ? 1 : 0,
          l.parentLabelId || null, l.customer || null, l.colour || null, l.pcCode || null, l.poNumber || null,
          l.machineId || null, l.printingMatter || null, l.generated, l.qrData]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/label-void', async (req, res) => {
  try {
    const { labelId, reason, voidedBy } = req.body;
    await pool.query(
      `UPDATE tracking_labels SET voided=1, void_reason=$1, voided_at=CURRENT_TIMESTAMP, voided_by=$2 WHERE id=$3`,
      [reason || '', voidedBy || '', labelId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/scan', async (req, res) => {
  try {
    const { scan } = req.body;
    if (!scan) return res.status(400).json({ ok: false, error: 'No scan data' });

    await pool.query(
      `INSERT INTO tracking_scans (id,label_id,batch_number,dept,type,ts,operator,size,qty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(id) DO NOTHING`,
      [scan.id, scan.labelId, scan.batchNumber, scan.dept, scan.type, scan.ts, scan.operator || null, scan.size || null, scan.qty || null]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/wastage', async (req, res) => {
  try {
    const { batchNumber, dept, salvage, remelt } = req.body;
    const id1 = Date.now().toString(36) + 's';
    const id2 = Date.now().toString(36) + 'r';
    if (salvage > 0) {
      await pool.query(
        `INSERT INTO tracking_wastage (id,batch_number,dept,type,qty) VALUES ($1,$2,$3,'salvage',$4)`,
        [id1, batchNumber, dept, salvage]
      );
    }
    if (remelt > 0) {
      await pool.query(
        `INSERT INTO tracking_wastage (id,batch_number,dept,type,qty) VALUES ($1,$2,$3,'remelt',$4)`,
        [id2, batchNumber, dept, remelt]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/stage-close', async (req, res) => {
  try {
    const { batchNumber, dept, closedBy } = req.body;
    await pool.query(
      `INSERT INTO tracking_stage_closure (id,batch_number,dept,closed,closed_at,closed_by)
       VALUES ($1,$2,$3,1,CURRENT_TIMESTAMP,$4)
       ON CONFLICT(batch_number, dept) DO UPDATE SET closed=1, closed_at=CURRENT_TIMESTAMP, closed_by=excluded.closed_by`,
      [Date.now().toString(36), batchNumber, dept, closedBy || '']
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/dispatch-record', async (req, res) => {
  try {
    const { record } = req.body;
    await pool.query(
      `INSERT INTO tracking_dispatch_records (id,batch_number,customer,qty,boxes,vehicle_no,invoice_no,remarks,ts,by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [record.id, record.batchNumber, record.customer || '', record.qty, record.boxes, record.vehicleNo || '',
        record.invoiceNo || '', record.remarks || '', record.ts, record.by || '']
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/dispatch-update', async (req, res) => {
  try {
    const { batchNumber, dispatchedQty, vehicleNo, invoiceNo } = req.body;
    const state = await getPlanningState();
    if (state.dispatchPlans) {
      const plan = state.dispatchPlans.find(p => p.batchNumber === batchNumber || p.productionOrderId === batchNumber);
      if (plan) {
        plan.actualDispatched = (plan.actualDispatched || 0) + dispatchedQty;
        if (plan.actualDispatched >= plan.qty) plan.status = 'dispatched';
        if (vehicleNo) plan.vehicleNo = vehicleNo;
        if (invoiceNo) plan.invoiceNo = invoiceNo;

        const existing = await pool.query('SELECT id FROM planning_state LIMIT 1');
        if (existing.rows.length) {
          await pool.query(
            'UPDATE planning_state SET state_json=$1, saved_at=CURRENT_TIMESTAMP WHERE id=$2',
            [state, existing.rows[0].id]
          );
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/ready-to-invoice', async (req, res) => {
  try {
    const { batchNumber } = req.body;
    const state = await getPlanningState();
    if (state.orders) {
      const order = state.orders.find(o => o.batchNumber === batchNumber);
      if (order) {
        order.trackingStatus = 'ready_to_invoice';
        order.readyToInvoiceAt = new Date().toISOString();
        const existing = await pool.query('SELECT id FROM planning_state LIMIT 1');
        if (existing.rows.length) {
          await pool.query(
            'UPDATE planning_state SET state_json=$1, saved_at=CURRENT_TIMESTAMP WHERE id=$2',
            [state, existing.rows[0].id]
          );
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/tracking/stage-status', async (req, res) => {
  try {
    const { batchNumber, statusMap } = req.body;
    const state = await getPlanningState();
    if (state.orders) {
      const order = state.orders.find(o => o.batchNumber === batchNumber);
      if (order) {
        order.stageStatus = statusMap;
        order.lastStageUpdate = new Date().toISOString();
        const existing = await pool.query('SELECT id FROM planning_state LIMIT 1');
        if (existing.rows.length) {
          await pool.query(
            'UPDATE planning_state SET state_json=$1, saved_at=CURRENT_TIMESTAMP WHERE id=$2',
            [state, existing.rows[0].id]
          );
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/tracking/batch-summary/:batchNumber', async (req, res) => {
  try {
    const bn = req.params.batchNumber;
    const scansResult = await pool.query(
      `SELECT dept, type, COUNT(*) as cnt FROM tracking_scans WHERE batch_number=$1 GROUP BY dept, type`,
      [bn]
    );
    const labelResult = await pool.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN voided=0 AND printed=1 THEN 1 ELSE 0 END) as printed, SUM(CASE WHEN voided=1 THEN 1 ELSE 0 END) as voided FROM tracking_labels WHERE batch_number=$1`,
      [bn]
    );
    const deptMap = {};
    scansResult.rows.forEach(s => {
      if (!deptMap[s.dept]) deptMap[s.dept] = { in: 0, out: 0 };
      deptMap[s.dept][s.type] = parseInt(s.cnt);
    });
    res.json({ ok: true, batchNumber: bn, deptMap, labelStats: labelResult.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/tracking/wip-summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT batch_number, dept, type, COUNT(*) as cnt FROM tracking_scans GROUP BY batch_number, dept, type`
    );
    const wipMap = {};
    result.rows.forEach(r => {
      if (!wipMap[r.batch_number]) wipMap[r.batch_number] = {};
      if (!wipMap[r.batch_number][r.dept]) wipMap[r.batch_number][r.dept] = { in: 0, out: 0 };
      wipMap[r.batch_number][r.dept][r.type] = parseInt(r.cnt);
    });
    const wipBoxes = {};
    Object.entries(wipMap).forEach(([bn, depts]) => {
      let netBoxes = 0;
      ['aim', 'printing', 'pi', 'packing'].forEach(dept => {
        if (depts[dept]) netBoxes += Math.max(0, (depts[dept].in || 0) - (depts[dept].out || 0));
      });
      wipBoxes[bn] = netBoxes;
    });
    res.json({ ok: true, wipBoxes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// STATIC FILE SERVING (MUST be after all /api/* routes)
// ═══════════════════════════════════════════════════════════════

// Static file serving with SPA fallback
app.use(express.static(path.join(__dirname, 'public'), {
  // If file doesn't exist, don't call next() - handle it ourselves
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// Only serve index.html as fallback for non-API paths
app.get('*', (req, res) => {
  // Never serve HTML for /api/* paths - they should have been caught by routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: 'API endpoint not found' });
  }
  const idx = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(idx)) res.sendFile(idx);
  else res.json({ ok: false, error: 'No frontend found.' });
});

// ─── Start Server ─────────────────────────────────────────────

async function start() {
  try {
    await createTables();
    app.listen(PORT, () => {
      console.log(`✅ Sunloc Server running on port ${PORT}`);
      console.log(`   DB: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'sunloc'}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
