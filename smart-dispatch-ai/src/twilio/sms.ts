import twilio from 'twilio';
import { WorkOrder } from '../work-order/types';

let twilioClient: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
}

/**
 * Send an SMS confirmation to the caller with the work order details.
 */
export async function sendWorkOrderSms(
  toPhone: string,
  workOrder: WorkOrder
): Promise<void> {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.warn('[SMS] TWILIO_PHONE_NUMBER not configured, skipping SMS');
    return;
  }

  // Format phone for international if needed
  let to = toPhone;
  if (to.match(/^[6-9]\d{7}$/)) {
    to = `+852${to}`; // Hong Kong local number
  }

  const body = [
    `【工程維護部門】工單已記錄`,
    `個案編號: ${workOrder.id}`,
    `情況: ${workOrder.situation}`,
    `我們會盡快安排跟進，如有查詢請致電工程維護熱線。`,
  ].join('\n');

  try {
    await getClient().messages.create({ body, from, to });
    console.log(`[SMS] Sent to ${to}`);
  } catch (err) {
    console.error('[SMS] Failed to send SMS:', err);
  }
}
