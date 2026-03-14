import { Router, Request, Response } from 'express';
import expressWs from 'express-ws';
import twilio from 'twilio';
import WebSocket from 'ws';
import { createConversationState, processUserMessage, getGreeting } from '../ai/conversation';
import { ConversationState } from '../work-order/types';
import { saveWorkOrder } from '../db/store';
import { sendWorkOrderSms } from './sms';

const { VoiceResponse } = twilio.twiml;

// Active conversation states keyed by CallSid
const activeCalls = new Map<string, ConversationState>();

export function setupVoiceRoutes(app: ReturnType<typeof expressWs>['app']): void {
  const router = Router();

  /**
   * POST /api/voice/incoming
   * Twilio calls this webhook when a new call arrives.
   * We respond with TwiML to connect to a Media Stream and say greeting.
   */
  router.post('/incoming', (req: Request, res: Response) => {
    const callSid: string = req.body.CallSid || 'unknown';
    const callerPhone: string = req.body.From || '';

    console.log(`[CALL] Incoming call: ${callSid} from ${callerPhone}`);

    const state = createConversationState(callSid, callerPhone);
    activeCalls.set(callSid, state);

    const twiml = new VoiceResponse();
    const connect = twiml.connect();

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    connect.stream({
      url: `${baseUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/api/voice/stream`,
      track: 'inbound_track',
    });

    // Initial greeting via <Say> with Cantonese voice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    twiml.say({ language: 'zh-HK', voice: 'Polly.Hiujin' as any }, getGreeting());

    res.type('text/xml');
    res.send(twiml.toString());
  });

  /**
   * POST /api/voice/status
   * Twilio calls this when call status changes.
   */
  router.post('/status', (req: Request, res: Response) => {
    const callSid: string = req.body.CallSid;
    const status: string = req.body.CallStatus;
    console.log(`[CALL] Status update: ${callSid} -> ${status}`);

    if (status === 'completed' || status === 'failed') {
      activeCalls.delete(callSid);
    }
    res.sendStatus(200);
  });

  /**
   * WebSocket /api/voice/stream
   * Handles real-time bidirectional audio with Twilio Media Streams.
   */
  // Using any for the ws parameter since expressWs types are complex
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app as any).ws('/api/voice/stream', (ws: WebSocket, req: Request) => {
    console.log('[WS] Media stream connected');

    let callSid = '';
    let streamSid = '';
    let audioBuffer: Buffer[] = [];
    let silenceTimer: NodeJS.Timeout | null = null;
    let state: ConversationState | null = null;

    const SILENCE_THRESHOLD_MS = 1500; // Wait 1.5s of silence before processing

    ws.on('message', async (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString()) as TwilioMediaMessage;

        switch (msg.event) {
          case 'connected':
            console.log('[WS] Stream connected');
            break;

          case 'start':
            callSid = msg.start?.callSid || '';
            streamSid = msg.streamSid || '';
            state = activeCalls.get(callSid) || null;
            console.log(`[WS] Stream started: callSid=${callSid}, streamSid=${streamSid}`);
            break;

          case 'media':
            if (!msg.media?.payload) break;
            // Accumulate audio chunks
            const chunk = Buffer.from(msg.media.payload, 'base64');
            audioBuffer.push(chunk);

            // Reset silence timer on each audio chunk
            if (silenceTimer) clearTimeout(silenceTimer);
            silenceTimer = setTimeout(async () => {
              if (audioBuffer.length === 0 || !state) return;

              // Combine audio chunks and process
              const combinedAudio = Buffer.concat(audioBuffer);
              audioBuffer = [];

              try {
                // Import STT lazily to avoid startup errors if Google creds not set
                const { transcribeAudio } = await import('../speech/stt');
                const transcript = await transcribeAudio(combinedAudio, 'MULAW', 8000);

                if (transcript && transcript.trim()) {
                  console.log(`[STT] Transcript: ${transcript}`);
                  const result = await processUserMessage(state, transcript);
                  console.log(`[AI] Response: ${result.response}`);

                  // Send TTS audio back via Twilio
                  await sendTtsToStream(ws, streamSid, result.response, callSid);

                  if (result.workOrder) {
                    await saveWorkOrder(result.workOrder);
                    console.log(`[WORKORDER] Saved: ${result.workOrder.id}`);

                    // Send SMS confirmation
                    if (state.callerPhone) {
                      await sendWorkOrderSms(state.callerPhone, result.workOrder);
                    }
                  }

                  if (result.isComplete) {
                    setTimeout(() => ws.close(), 3000);
                  }
                }
              } catch (err) {
                console.error('[WS] Error processing audio:', err);
              }
            }, SILENCE_THRESHOLD_MS);
            break;

          case 'stop':
            console.log('[WS] Stream stopped');
            if (silenceTimer) clearTimeout(silenceTimer);
            break;
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Connection closed');
      if (silenceTimer) clearTimeout(silenceTimer);
    });

    ws.on('error', (err) => {
      console.error('[WS] WebSocket error:', err);
    });
  });

  // Mount the router
  (app as ReturnType<typeof expressWs>['app']).use('/api/voice', router);
}

/**
 * Send TTS audio back to the Twilio stream
 */
async function sendTtsToStream(
  ws: WebSocket,
  streamSid: string,
  text: string,
  _callSid: string
): Promise<void> {
  try {
    const { synthesizeSpeech } = await import('../speech/tts');
    const audioBuffer = await synthesizeSpeech(text, 'MULAW');
    const base64Audio = audioBuffer.toString('base64');

    const mediaMessage = {
      event: 'media',
      streamSid,
      media: {
        payload: base64Audio,
      },
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(mediaMessage));
    }
  } catch (err) {
    console.error('[TTS] Failed to send audio to stream:', err);
  }
}

// Twilio Media Stream message types
interface TwilioMediaMessage {
  event: 'connected' | 'start' | 'media' | 'stop';
  streamSid?: string;
  sequenceNumber?: string;
  start?: {
    streamSid: string;
    callSid: string;
    accountSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
  stop?: {
    accountSid: string;
    callSid: string;
  };
}

export { activeCalls };
