import { ExtractedData, WorkOrder } from './types';
import {
  generateCaseId,
  generateVNumber,
  formatWorkOrderDate,
  generateRefDate,
} from './id-generator';

/**
 * Generate a WorkOrder from extracted conversation data and call start time.
 */
export function generateWorkOrder(
  extracted: ExtractedData,
  callStartTime: Date,
  callSid?: string
): WorkOrder {
  const openDate = callStartTime;
  const refDate = generateRefDate(openDate);
  const caseId = generateCaseId();
  const vNumber = generateVNumber();

  // Ensure detail ends with the required suffix
  let detail = extracted.detail || '';
  const requiredSuffix = '，要求部門跟進及回覆。';
  if (!detail.endsWith(requiredSuffix)) {
    // Remove trailing period/punctuation if present then append
    detail = detail.replace(/[。，,.]?\s*$/, '') + requiredSuffix;
  }

  const workOrder: WorkOrder = {
    id: caseId,
    open_date: formatWorkOrderDate(openDate),
    ref_date: formatWorkOrderDate(refDate),
    contact_method: extracted.caller_phone || '未提供',
    situation: extracted.summary || '',
    equipment_id: extracted.equipment_id || '無',
    detail,
    v_number: vNumber,
    status: 'new',
    created_at: new Date(),
    raw_extracted: extracted,
    call_sid: callSid,
  };

  workOrder.formatted_text = formatWorkOrderText(workOrder);
  return workOrder;
}

/**
 * Format the work order into the exact required text format.
 */
export function formatWorkOrderText(order: WorkOrder): string {
  return [
    `個案編號: ${order.id}`,
    `日期(Open Date): ${order.open_date}`,
    `日期(Ref/ Date): ${order.ref_date}`,
    `聯絡方法: ${order.contact_method}`,
    `情況: ${order.situation}`,
    `街燈編號: ${order.equipment_id}`,
    `詳情: ${order.detail}`,
    `[${order.v_number}]`,
  ].join('\n');
}
