/**
 * Retell AI Custom LLM WebSocket Handler
 *
 * Retell connects to this WebSocket endpoint when a call comes in.
 * Retell handles all STT and TTS — we only deal with text in/out.
 *
 * Protocol:
 *   Retell → us:  { interaction_type, response_id, transcript, call }
 *   us → Retell:  { response_type: "response", response_id, content, content_complete, end_call }
 */

import WebSocket from 'ws';
import { Request } from 'express';
import expressWs from 'express-ws';
import { processTranscript, CallSession } from '../ai/conversation';
import { saveWorkOrder } from '../db/store';
import { GREETING_MESSAGE } from '../ai/prompts';

// Active sessions keyed by callId
const sessions = new Map<string, CallSession>();

export function setupRetellRoutes(app: ReturnType<typeof expressWs>['app']): void {
  /**
   * WebSocket /llm-websocket
   * Retell connects here for every incoming call (Custom LLM mode).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app as any).ws('/llm-websocket', (ws: WebSocket, _req: Request) => {
    console.log('[Retell] New WebSocket connection');

    ws.on('message', async (data: WebSocket.RawData) => {
      let msg: RetellRequest;
      try {
        msg = JSON.parse(data.toString()) as RetellRequest;
      } catch {
        console.error('[Retell] Failed to parse message');
        return;
      }

      switch (msg.interaction_type) {
        case 'call_started': {
          const callId = msg.call?.call_id || `retell-${Date.now()}`;
          const fromNumber = msg.call?.from_number || '';
          console.log(`[Retell] Call started: ${callId} from ${fromNumber}`);
          sessions.set(callId, { callId, startTime: new Date(), callerPhone: fromNumber });

          // Send opening greeting immediately
          sendResponse(ws, msg.response_id ?? 0, GREETING_MESSAGE, true);
          break;
        }

        case 'ping_pong': {
          // Must reply to keep connection alive
          ws.send(JSON.stringify({ response_type: 'ping_pong', timestamp: msg.timestamp }));
          break;
        }

        case 'update_only': {
          // Transcript update, no response needed
          break;
        }

        case 'response_required': {
          const callId = msg.call?.call_id || '';
          const session = sessions.get(callId);
          if (!session) {
            console.warn(`[Retell] No session for callId: ${callId}`);
            return;
          }

          const transcript = msg.transcript ?? [];
          console.log(`[Retell] response_required, turns: ${transcript.length}`);

          try {
            const result = await processTranscript(session, transcript);
            console.log(`[AI] → "${result.response.slice(0, 80)}..."`);

            sendResponse(ws, msg.response_id ?? 0, result.response, true, result.isComplete);

            if (result.workOrder) {
              saveWorkOrder(result.workOrder);
              console.log(`[WorkOrder] Saved: ${result.workOrder.id}`);
              console.log(result.workOrder.formatted_text);
            }
          } catch (err) {
            console.error('[Retell] Error generating response:', err);
            sendResponse(ws, msg.response_id ?? 0, '唔好意思，系統出現問題，請稍後再試。', true);
          }
          break;
        }

        case 'call_ended': {
          const callId = msg.call?.call_id || '';
          console.log(`[Retell] Call ended: ${callId}`);
          sessions.delete(callId);
          break;
        }
      }
    });

    ws.on('close', () => console.log('[Retell] WebSocket closed'));
    ws.on('error', (err) => console.error('[Retell] WebSocket error:', err));
  });
}

function sendResponse(
  ws: WebSocket,
  responseId: number,
  content: string,
  contentComplete: boolean,
  endCall = false
): void {
  const msg: RetellResponse = {
    response_type: 'response',
    response_id: responseId,
    content,
    content_complete: contentComplete,
    end_call: endCall || undefined,
  };
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ─── Retell WebSocket Protocol Types ─────────────────────────────────────

interface RetellTranscriptTurn {
  role: 'agent' | 'user';
  content: string;
}

interface RetellCallInfo {
  call_id: string;
  agent_id?: string;
  call_status?: string;
  from_number?: string;
  to_number?: string;
  direction?: string;
  call_type?: string;
  metadata?: Record<string, unknown>;
}

interface RetellRequest {
  interaction_type:
    | 'call_started'
    | 'call_ended'
    | 'ping_pong'
    | 'update_only'
    | 'response_required';
  response_id?: number;
  timestamp?: number;
  transcript?: RetellTranscriptTurn[];
  call?: RetellCallInfo;
}

interface RetellResponse {
  response_type: 'response' | 'ping_pong';
  response_id: number;
  content: string;
  content_complete: boolean;
  end_call?: boolean;
}

export { sessions };
