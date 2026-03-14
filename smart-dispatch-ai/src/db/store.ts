import * as fs from 'fs';
import * as path from 'path';
import { WorkOrder } from '../work-order/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'workorders.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAll(): WorkOrder[] {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) return [];
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as WorkOrder[];
    return parsed.map((o) => ({ ...o, created_at: new Date(o.created_at) }));
  } catch {
    return [];
  }
}

function writeAll(orders: WorkOrder[]): void {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2), 'utf-8');
}

export function saveWorkOrder(workOrder: WorkOrder): void {
  const orders = readAll();
  const idx = orders.findIndex((o) => o.id === workOrder.id);
  if (idx >= 0) {
    orders[idx] = workOrder;
  } else {
    orders.unshift(workOrder);
  }
  writeAll(orders);
  console.log('[DB] Work order saved:', workOrder.id);
}

export function getAllWorkOrders(): WorkOrder[] {
  return readAll().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getWorkOrderById(id: string): WorkOrder | null {
  return readAll().find((o) => o.id === id) || null;
}

export function updateWorkOrderStatus(
  id: string,
  status: 'new' | 'processing' | 'completed'
): void {
  const orders = readAll();
  const order = orders.find((o) => o.id === id);
  if (order) {
    order.status = status;
    writeAll(orders);
  }
}

export function getStats(): {
  total: number;
  today: number;
  pending: number;
  processing: number;
  completed: number;
} {
  const orders = readAll();
  const now = new Date();
  const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  return {
    total: orders.length,
    today: orders.filter((o) => o.open_date.startsWith(todayStr)).length,
    pending: orders.filter((o) => o.status === 'new').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };
}
