import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompts';
import { extractJsonFromResponse, isTransferRequest, isConversationComplete } from './extractor';
import { generateWorkOrder } from '../work-order/generator';
import { WorkOrder } from '../work-order/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60000 });

export interface CallSession {
  callId: string;
  startTime: Date;
  callerPhone: string;
  workOrderSaved?: boolean;
}

interface TranscriptTurn {
  role: 'agent' | 'user';
  content: string;
}

/**
 * Process Retell's full transcript and return the next AI response.
 *
 * Retell sends the entire conversation history each time, so we pass it
 * directly to Claude without maintaining our own message store.
 */
export async function processTranscript(
  session: CallSession,
  transcript: TranscriptTurn[]
): Promise<{ response: string; workOrder?: WorkOrder; isComplete: boolean }> {
  // Map Retell roles to Claude roles
  const messages: Anthropic.MessageParam[] = transcript.map((t) => ({
    role: t.role === 'agent' ? 'assistant' : 'user',
    content: t.content,
  }));

  // Claude requires messages to start with 'user' role
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', content: '你好' });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Try to extract a completed work order from the response
  let workOrder: WorkOrder | undefined;
  if (!session.workOrderSaved) {
    const extracted = extractJsonFromResponse(rawText);
    if (extracted) {
      if (!extracted.caller_phone && session.callerPhone) {
        extracted.caller_phone = session.callerPhone;
      }
      workOrder = generateWorkOrder(extracted, session.startTime, session.callId);
      session.workOrderSaved = true;
    }
  }

  const isComplete =
    isConversationComplete(rawText) ||
    isTransferRequest(rawText) ||
    !!workOrder;

  return {
    response: cleanResponseText(rawText),
    workOrder,
    isComplete,
  };
}

/**
 * Strip JSON blocks from AI text before sending to TTS.
 */
function cleanResponseText(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/gi, '')
    .replace(/```[\s\S]*?```/gi, '')
    .replace(/\{[\s\S]*?"confirmed"\s*:\s*true[\s\S]*?\}/g, '')
    .trim();
}

// ─── Legacy helpers kept for test-call.ts compatibility ──────────────────

import { ConversationState } from '../work-order/types';

export function createConversationState(callSid: string, callerPhone: string): ConversationState {
  return {
    callSid,
    startTime: new Date(),
    messages: [],
    step: 'greeting',
    extractedData: {},
    isComplete: false,
    needsTransfer: false,
    callerPhone,
  };
}

export async function processUserMessage(
  state: ConversationState,
  userInput: string
): Promise<{ response: string; workOrder?: WorkOrder; isComplete: boolean; needsTransfer: boolean }> {
  state.messages.push({ role: 'user', content: userInput });

  const transcript: TranscriptTurn[] = state.messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'agent',
    content: m.content,
  }));

  const session: CallSession = {
    callId: state.callSid,
    startTime: state.startTime,
    callerPhone: state.callerPhone,
    workOrderSaved: state.isComplete,
  };

  const result = await processTranscript(session, transcript);
  state.messages.push({ role: 'assistant', content: result.response });

  if (result.isComplete) state.isComplete = true;

  return {
    response: result.response,
    workOrder: result.workOrder,
    isComplete: result.isComplete,
    needsTransfer: isTransferRequest(result.response),
  };
}

export function getGreeting(): string {
  const { GREETING_MESSAGE } = require('./prompts');
  return GREETING_MESSAGE as string;
}
