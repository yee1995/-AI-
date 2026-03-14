import 'dotenv/config';
import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';

import { setupVoiceRoutes } from './twilio/voice-handler';
import { getAllWorkOrders, getWorkOrderById, updateWorkOrderStatus, getStats } from './db/store';

const PORT = parseInt(process.env.PORT || '3000', 10);

// Bootstrap Express with WebSocket support
const expressApp = express();
const { app } = expressWs(expressApp);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static files
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// ─── Twilio Voice Routes ───────────────────────────────────────────────────
setupVoiceRoutes(app);

// ─── REST API Routes ───────────────────────────────────────────────────────

/**
 * GET /api/work-orders
 * Return all work orders for the dashboard
 */
app.get('/api/work-orders', (_req, res) => {
  try {
    const orders = getAllWorkOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('[API] Error fetching work orders:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch work orders' });
  }
});

/**
 * GET /api/work-orders/:id
 * Return a single work order
 */
app.get('/api/work-orders/:id', (req, res) => {
  try {
    const order = getWorkOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Work order not found' });
      return;
    }
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch work order' });
  }
});

/**
 * PATCH /api/work-orders/:id/status
 * Update work order status
 */
app.patch('/api/work-orders/:id/status', (req, res) => {
  try {
    const { status } = req.body as { status: 'new' | 'processing' | 'completed' };
    if (!['new', 'processing', 'completed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }
    updateWorkOrderStatus(req.params.id, status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

/**
 * GET /api/stats
 * Return dashboard statistics
 */
app.get('/api/stats', (_req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve Dashboard ───────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>工單管理系統正在啟動中...</h1>');
  }
});

// ─── Start Server ──────────────────────────────────────────────────────────
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     粵語 AI 智能接線及派單系統                        ║
║     Cantonese AI Dispatch System                     ║
╠══════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                      ║
║  Dashboard: http://localhost:${PORT}                   ║
║  API: http://localhost:${PORT}/api                     ║
╚══════════════════════════════════════════════════════╝

Twilio Webhook URL: \${BASE_URL}/api/voice/incoming
`);
});

export default app;
