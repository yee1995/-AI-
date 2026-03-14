import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { WorkOrder } from '../work-order/types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'workorders.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      open_date TEXT NOT NULL,
      ref_date TEXT NOT NULL,
      contact_method TEXT,
      situation TEXT,
      equipment_id TEXT,
      detail TEXT,
      v_number TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT NOT NULL,
      call_sid TEXT,
      formatted_text TEXT,
      raw_extracted TEXT
    );
  `);
  console.log('[DB] Schema initialized');
}

export function saveWorkOrder(workOrder: WorkOrder): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO work_orders
      (id, open_date, ref_date, contact_method, situation, equipment_id, detail,
       v_number, status, created_at, call_sid, formatted_text, raw_extracted)
    VALUES
      (@id, @open_date, @ref_date, @contact_method, @situation, @equipment_id, @detail,
       @v_number, @status, @created_at, @call_sid, @formatted_text, @raw_extracted)
  `);

  stmt.run({
    id: workOrder.id,
    open_date: workOrder.open_date,
    ref_date: workOrder.ref_date,
    contact_method: workOrder.contact_method,
    situation: workOrder.situation,
    equipment_id: workOrder.equipment_id,
    detail: workOrder.detail,
    v_number: workOrder.v_number,
    status: workOrder.status,
    created_at: workOrder.created_at.toISOString(),
    call_sid: workOrder.call_sid || null,
    formatted_text: workOrder.formatted_text || null,
    raw_extracted: JSON.stringify(workOrder.raw_extracted),
  });
}

export function getAllWorkOrders(): WorkOrder[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM work_orders ORDER BY created_at DESC').all() as DbRow[];
  return rows.map(rowToWorkOrder);
}

export function getWorkOrderById(id: string): WorkOrder | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as DbRow | undefined;
  return row ? rowToWorkOrder(row) : null;
}

export function updateWorkOrderStatus(
  id: string,
  status: 'new' | 'processing' | 'completed'
): void {
  const database = getDb();
  database.prepare('UPDATE work_orders SET status = ? WHERE id = ?').run(status, id);
}

export function getStats(): {
  total: number;
  today: number;
  pending: number;
  processing: number;
  completed: number;
} {
  const database = getDb();
  const now = new Date();
  const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const total = (database.prepare('SELECT COUNT(*) as count FROM work_orders').get() as { count: number }).count;
  const today = (database.prepare("SELECT COUNT(*) as count FROM work_orders WHERE open_date LIKE ?").get(`${todayStr}%`) as { count: number }).count;
  const pending = (database.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'new'").get() as { count: number }).count;
  const processing = (database.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'processing'").get() as { count: number }).count;
  const completed = (database.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'completed'").get() as { count: number }).count;

  return { total, today, pending, processing, completed };
}

interface DbRow {
  id: string;
  open_date: string;
  ref_date: string;
  contact_method: string;
  situation: string;
  equipment_id: string;
  detail: string;
  v_number: string;
  status: 'new' | 'processing' | 'completed';
  created_at: string;
  call_sid: string | null;
  formatted_text: string | null;
  raw_extracted: string;
}

function rowToWorkOrder(row: DbRow): WorkOrder {
  return {
    id: row.id,
    open_date: row.open_date,
    ref_date: row.ref_date,
    contact_method: row.contact_method,
    situation: row.situation,
    equipment_id: row.equipment_id,
    detail: row.detail,
    v_number: row.v_number,
    status: row.status,
    created_at: new Date(row.created_at),
    call_sid: row.call_sid || undefined,
    formatted_text: row.formatted_text || undefined,
    raw_extracted: JSON.parse(row.raw_extracted),
  };
}
