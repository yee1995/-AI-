import 'dotenv/config';
import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';

import { setupRetellRoutes } from './retell/llm-handler';
import { getAllWorkOrders, getWorkOrderById, updateWorkOrderStatus, getStats } from './db/store';

const PORT = parseInt(process.env.PORT || '3000', 10);

const expressApp = express();
const { app } = expressWs(expressApp);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
app.use(express.static(publicDir));

// ─── Retell Custom LLM WebSocket ──────────────────────────────────────────
setupRetellRoutes(app);

// ─── REST API ─────────────────────────────────────────────────────────────

app.get('/api/work-orders', (_req, res) => {
  try {
    res.json({ success: true, data: getAllWorkOrders() });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch work orders' });
  }
});

app.get('/api/work-orders/:id', (req, res) => {
  try {
    const order = getWorkOrderById(req.params.id);
    if (!order) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: order });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch work order' });
  }
});

app.patch('/api/work-orders/:id/status', (req, res) => {
  const { status } = req.body as { status: 'new' | 'processing' | 'completed' };
  if (!['new', 'processing', 'completed'].includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid status' });
    return;
  }
  updateWorkOrderStatus(req.params.id, status);
  res.json({ success: true });
});

app.get('/api/stats', (_req, res) => {
  try {
    res.json({ success: true, data: getStats() });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ─── Dashboard ────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(fs.existsSync(indexPath) ? indexPath : path.join(__dirname, '../public/index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     粵語 AI 智能接線及派單系統  (Retell AI)            ║
╠══════════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}                    ║
║  Dashboard: http://localhost:${PORT}                    ║
║  Retell WS: wss://<ngrok>/llm-websocket               ║
╚══════════════════════════════════════════════════════╝
`);
});

export default app;
